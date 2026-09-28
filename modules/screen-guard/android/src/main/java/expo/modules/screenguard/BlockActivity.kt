package expo.modules.screenguard

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

private const val TAG = "ScreenGuard"

/** Extra carrying the blocked package's name, set by whoever starts this Activity. */
const val EXTRA_BLOCKED_PACKAGE = "expo.modules.screenguard.extra.BLOCKED_PACKAGE"

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
        android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
      ) { goHome() }
    }
  }

  @Suppress("DEPRECATION")
  override fun onBackPressed() {
    if (Build.VERSION.SDK_INT < 33) {
      goHome()
    } else {
      super.onBackPressed()
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    applyBlockedPackage(intent)
  }

  override fun onResume() {
    super.onResume()
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
        ViewGroup.LayoutParams.MATCH_PARENT,
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
