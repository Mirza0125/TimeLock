package expo.modules.screenguard

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent

private const val TAG = "ScreenGuard"

/**
 * OS-bound accessibility service. Watches window-state events; for the
 * designated spike test package only, it reads the JS-set [BlockStrategy]
 * and attempts the native block Activity.
 *
 * Task 2 (BlockLauncher/BlockOutcomeDecider) replaces the inline debounce and
 * cascade logic below with the full two-path cascade; this tracer proves the
 * plugin-declared service can reach the block Activity at all.
 *
 * Privacy invariant: every package other than [SPIKE_TARGET_PACKAGE] is
 * ignored silently - no log, no storage. Phase 2 replaces the fixed constant
 * with LimitEngine decisions.
 */
class GuardAccessibilityService : AccessibilityService() {

  companion object {
    // Phase 2 replaces this fixed constant with LimitEngine decisions.
    const val SPIKE_TARGET_PACKAGE = "com.google.android.deskclock"
    private const val DEBOUNCE_MS = 1500L
  }

  private var inFlightUntilMs = 0L

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

    val strategy = BlockStrategyStore(this).get()
    if (strategy == BlockStrategy.OFF) {
      Log.i(TAG, "BLOCK_SKIPPED reason=disabled pkg=$pkg")
      return
    }

    val now = SystemClock.elapsedRealtime()
    if (now < inFlightUntilMs) return
    inFlightUntilMs = now + DEBOUNCE_MS

    try {
      val intent = Intent(this, BlockActivity::class.java).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS,
        )
        putExtra(EXTRA_BLOCKED_PACKAGE, pkg)
      }
      startActivity(intent)
      Log.i(TAG, "BLOCK_ATTEMPT pkg=$pkg path=activity")
    } catch (e: Exception) {
      Log.w(TAG, "startActivity(BlockActivity) threw: ${e.message}")
    }
  }

  override fun onInterrupt() {
    // no-op
  }
}
