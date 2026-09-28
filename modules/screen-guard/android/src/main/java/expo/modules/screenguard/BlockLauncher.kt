package expo.modules.screenguard

import android.accessibilityservice.AccessibilityService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log

private const val TAG = "ScreenGuard"
private const val NOTIFICATION_CHANNEL_ID = "screen_guard_block"
private const val NOTIFICATION_ID = 4201

/**
 * Owns the two-path block cascade for one [AccessibilityService]: try the
 * native block Activity, confirm it by [BlockActivity]'s own resume signal
 * (not by `startActivity` merely not throwing - see
 * [BlockOutcomeDecider.resolveActivityAttempt]), and fall back to
 * `GLOBAL_ACTION_HOME` plus a heads-up notification when the strategy forces
 * it or the activity attempt is unconfirmed/failed. Debounces repeated
 * attempts per package so a burst of window-state events resolves to exactly
 * one outcome.
 */
class BlockLauncher(private val service: AccessibilityService) {

  private val handler = Handler(Looper.getMainLooper())
  private val store = BlockStrategyStore(service)
  private val inFlightUntilMs = mutableMapOf<String, Long>()

  fun onTargetForeground(pkg: String) {
    val initialPath = BlockOutcomeDecider.initialPath(store.get())

    if (initialPath == BlockPath.NONE) {
      Log.i(TAG, "BLOCK_SKIPPED reason=disabled pkg=$pkg")
      return
    }

    val now = SystemClock.elapsedRealtime()
    if (!BlockOutcomeDecider.shouldAttempt(now, inFlightUntilMs[pkg] ?: 0L)) {
      return
    }
    inFlightUntilMs[pkg] = now + BlockOutcomeDecider.DEBOUNCE_MS

    when (initialPath) {
      BlockPath.ACTIVITY -> attemptActivity(pkg, now)
      BlockPath.FALLBACK -> runFallback(pkg, BlockOutcomeDecider.forcedFallback())
      BlockPath.NONE -> Unit // unreachable: handled above
    }
  }

  private fun attemptActivity(pkg: String, attemptAtMs: Long) {
    val launchThrew = try {
      service.startActivity(blockActivityIntent(pkg))
      Log.i(TAG, "BLOCK_ATTEMPT pkg=$pkg path=activity")
      false
    } catch (e: Exception) {
      Log.w(TAG, "startActivity(BlockActivity) threw: ${e.message}")
      true
    }

    if (launchThrew) {
      runFallback(pkg, BlockOutcomeDecider.resolveActivityAttempt(launchThrew = true, confirmed = false))
      return
    }

    // startActivity() not throwing does not prove the Activity reached the
    // foreground under BAL restrictions (ARCHITECTURE.md correction #2) - the
    // real confirmation signal is BlockActivity's own onResume timestamp,
    // checked here after CONFIRM_DEADLINE_MS.
    handler.postDelayed({
      val resumedAt = BlockSignals.lastResumedAtMs
      val confirmed = resumedAt >= 0 && BlockOutcomeDecider.isConfirmed(attemptAtMs, resumedAt)
      val decision = BlockOutcomeDecider.resolveActivityAttempt(launchThrew = false, confirmed = confirmed)
      if (decision.path == BlockPath.ACTIVITY) {
        val latencyMs = resumedAt - attemptAtMs
        Log.i(
          TAG,
          "BLOCK_OUTCOME path=activity reason=confirmed pkg=$pkg latencyMs=$latencyMs home=- notified=-",
        )
      } else {
        runFallback(pkg, decision)
      }
    }, BlockOutcomeDecider.CONFIRM_DEADLINE_MS)
  }

  private fun runFallback(pkg: String, decision: BlockDecision) {
    val home = service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
    val notified = postFallbackNotification(pkg)
    Log.i(
      TAG,
      "BLOCK_OUTCOME path=fallback reason=${decision.reason.wireName} pkg=$pkg latencyMs=- home=$home notified=$notified",
    )
  }

  private fun postFallbackNotification(pkg: String): Boolean {
    val notificationManager = service.getSystemService(NotificationManager::class.java)
    if (!notificationManager.areNotificationsEnabled()) {
      Log.i(TAG, "NOTIFY_SKIPPED reason=permission pkg=$pkg")
      return false
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        service.getString(R.string.screen_guard_fallback_channel_name),
        NotificationManager.IMPORTANCE_HIGH,
      )
      notificationManager.createNotificationChannel(channel)
    }

    val contentIntent = PendingIntent.getActivity(
      service,
      NOTIFICATION_ID,
      blockActivityIntent(pkg),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    notificationManager.notify(NOTIFICATION_ID, buildNotification(appLabelFor(pkg), contentIntent))
    return true
  }

  @Suppress("DEPRECATION")
  private fun buildNotification(label: String, contentIntent: PendingIntent): Notification {
    val title = service.getString(R.string.screen_guard_fallback_title, label)
    val text = service.getString(R.string.screen_guard_fallback_text)
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(service, NOTIFICATION_CHANNEL_ID)
        .setSmallIcon(service.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(text)
        .setContentIntent(contentIntent)
        .setAutoCancel(true)
        .build()
    } else {
      Notification.Builder(service)
        .setSmallIcon(service.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(text)
        .setContentIntent(contentIntent)
        .setAutoCancel(true)
        .setPriority(Notification.PRIORITY_HIGH)
        .build()
    }
  }

  private fun blockActivityIntent(pkg: String): Intent =
    Intent(service, BlockActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS,
      )
      putExtra(EXTRA_BLOCKED_PACKAGE, pkg)
    }

  private fun appLabelFor(pkg: String): String = try {
    service.packageManager
      .getApplicationLabel(service.packageManager.getApplicationInfo(pkg, 0))
      .toString()
  } catch (e: Exception) {
    pkg
  }

  fun cancelPending() {
    handler.removeCallbacksAndMessages(null)
  }
}
