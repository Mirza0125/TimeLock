package expo.modules.screenguard

import android.accessibilityservice.AccessibilityService
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.StrictMode
import android.util.Log
import android.view.accessibility.AccessibilityEvent

private const val TAG = "ScreenGuard"

/**
 * OS-bound accessibility service. Watches window-state events; for the
 * designated spike test package only, delegates to [BlockLauncher], which
 * owns debounce, strategy resolution and the two-path block cascade.
 *
 * Privacy invariant: every package other than [SPIKE_TARGET_PACKAGE] is
 * ignored silently - no log, no storage. Phase 2 replaces the fixed constant
 * with LimitEngine decisions.
 */
class GuardAccessibilityService : AccessibilityService() {

  companion object {
    // Phase 2 replaces this fixed constant with LimitEngine decisions.
    const val SPIKE_TARGET_PACKAGE = "com.google.android.deskclock"
  }

  private lateinit var blockLauncher: BlockLauncher

  override fun onCreate() {
    super.onCreate()
    blockLauncher = BlockLauncher(this)

    // Android 16's purpose-built signal for a blocked background-activity
    // launch (01-RESEARCH.md "Don't Hand-Roll": prefer this over a
    // hand-rolled timing heuristic). Debuggable builds only, SDK_INT >= 36.
    // If `detectBlockedBackgroundActivityLaunch()` does not resolve against
    // this compileSdk, the call is skipped here and noted in
    // 01-04-SUMMARY.md; detection then relies on BlockActivity's own resume
    // signal (BlockOutcomeDecider.isConfirmed) plus system ActivityTaskManager
    // logs instead.
    if (Build.VERSION.SDK_INT >= 36 && isDebuggableBuild()) {
      try {
        val policyBuilder = StrictMode.VmPolicy.Builder(StrictMode.getVmPolicy())
        policyBuilder.detectBlockedBackgroundActivityLaunch()
        policyBuilder.penaltyLog()
        StrictMode.setVmPolicy(policyBuilder.build())
      } catch (e: Throwable) {
        Log.w(TAG, "StrictMode.detectBlockedBackgroundActivityLaunch unavailable: ${e.message}")
      }
    }
  }

  private fun isDebuggableBuild(): Boolean =
    (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  override fun onServiceConnected() {
    super.onServiceConnected()
    Log.i(TAG, "SERVICE_CONNECTED")
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    // Privacy: silently ignore every package other than the designated spike
    // target. No log, no storage - the service sees every app switch.
    if (pkg != SPIKE_TARGET_PACKAGE) return

    blockLauncher.onTargetForeground(pkg)
  }

  override fun onInterrupt() {
    // no-op
  }

  override fun onDestroy() {
    if (::blockLauncher.isInitialized) {
      blockLauncher.cancelPending()
    }
    super.onDestroy()
  }
}
