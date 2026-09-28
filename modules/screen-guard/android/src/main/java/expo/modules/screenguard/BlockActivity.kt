package expo.modules.screenguard

import android.app.Activity
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

private const val TAG = "ScreenGuard"
private const val FALLBACK_NOTIFICATION_ID = 4201

/** Extra carrying the blocked package's name, set by whoever starts this Activity. */
const val EXTRA_BLOCKED_PACKAGE = "expo.modules.screenguard.extra.BLOCKED_PACKAGE"

/**
 * Confirmation signal for the activity block path: [BlockLauncher] reads
 * [lastResumedAtMs] after [BlockOutcomeDecider.CONFIRM_DEADLINE_MS] to decide
 * whether the launch actually reached the foreground - `startActivity()` not
 * throwing is not sufficient proof (ARCHITECTURE.md correction #2).
 */
object BlockSignals {
    @Volatile
    var lastResumedAtMs: Long = -1L
}

/**
 * Native full-screen block UI. Not exported; only ScreenGuard's own service
 * and notification `PendingIntent` can start it. Close and Back both send the
 * device home - never back into the blocked app.
 */
class BlockActivity : Activity() {

    private lateinit var messageView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildLayout()
        applyBlockedPackage(intent)

        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT
            ) { goHome() }
        }
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        // Never defer to super.onBackPressed(): enableOnBackInvokedCallback
        // is app-wide "false" (app.json's predictiveBackGestureEnabled), so
        // the OnBackInvokedCallback registered in onCreate above is never
        // invoked by the system on any SDK level - the platform always
        // routes back navigation through this legacy onBackPressed() path
        // instead. The previous SDK_INT branch fell through to
        // super.onBackPressed() (finish()) on API 33+, which returned the
        // user to the just-blocked app underneath instead of going home
        // (CR-01). Pinned by BlockOutcomeDeciderTest#alwaysGoHomeOnBackPress.
        check(BlockOutcomeDecider.alwaysGoHomeOnBackPress())
        goHome()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        applyBlockedPackage(intent)
    }

    override fun onResume() {
        super.onResume()
        BlockSignals.lastResumedAtMs = SystemClock.elapsedRealtime()
        val pkg = intent.getStringExtra(EXTRA_BLOCKED_PACKAGE) ?: "unknown"
        Log.i(TAG, "BLOCK_RESUMED pkg=$pkg")
    }

    private fun applyBlockedPackage(intent: Intent) {
        val pkg = intent.getStringExtra(EXTRA_BLOCKED_PACKAGE) ?: return
        val label = try {
            packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            pkg
        }
        messageView.text = getString(R.string.screen_guard_block_message, label)

        // This activity was opened with the blocked-package extra - if it got
        // here via the fallback notification, dismiss it now that the block
        // screen itself is visible.
        getSystemService(NotificationManager::class.java)?.cancel(FALLBACK_NOTIFICATION_ID)
    }

    private fun goHome() {
        val home = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(home)
        finish()
    }

    private fun buildLayout() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setPaddingRelative(64, 64, 64, 64)
            fitsSystemWindows = true
        }

        val title = TextView(this).apply {
            text = getString(R.string.screen_guard_block_title)
            textSize = 22f
            gravity = Gravity.CENTER
        }
        messageView = TextView(this).apply {
            textSize = 16f
            gravity = Gravity.CENTER
            setPaddingRelative(0, 24, 0, 24)
        }
        val close = Button(this).apply {
            text = getString(R.string.screen_guard_block_close)
            setOnClickListener { goHome() }
        }

        root.addView(title)
        root.addView(messageView)
        root.addView(close)
        setContentView(root)
    }
}
