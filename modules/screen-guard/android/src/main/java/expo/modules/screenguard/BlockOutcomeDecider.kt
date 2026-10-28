package expo.modules.screenguard

/**
 * Pure Kotlin decision functions for the block cascade - no `android.*`
 * imports, so Plan 01-06 can unit-test this on the JVM without a device or
 * emulator.
 *
 * The invariant this object encodes (see 01-04-PLAN.md
 * `assumption_delta_decision`): every non-disabled attempt resolves to
 * exactly one [BlockPath]. An unconfirmed or failed activity attempt always
 * resolves to [BlockPath.FALLBACK]; [BlockOutcomeReason.FORCED] (the
 * `homeNotification` strategy) always resolves to [BlockPath.FALLBACK] too.
 * "Blocked" never means "BlockActivity is visible" - it means one of these
 * two paths ran.
 */
enum class BlockPath { NONE, ACTIVITY, FALLBACK }

enum class BlockOutcomeReason(val wireName: String) {
    DISABLED("disabled"),
    CONFIRMED("confirmed"),
    UNCONFIRMED("unconfirmed"),
    LAUNCH_ERROR("launchError"),
    FORCED("forced")
}

data class BlockDecision(val path: BlockPath, val reason: BlockOutcomeReason)

object BlockOutcomeDecider {

    /** Deadline (elapsedRealtime ms) for BlockActivity to confirm its own resume. */
    const val CONFIRM_DEADLINE_MS = 800L

    /** Minimum time between block attempts for the same package. */
    const val DEBOUNCE_MS = 1500L

    /** OFF -> NONE, ACTIVITY_FIRST -> ACTIVITY, HOME_NOTIFICATION -> FALLBACK. */
    fun initialPath(strategy: BlockStrategy): BlockPath = when (strategy) {
        BlockStrategy.OFF -> BlockPath.NONE
        BlockStrategy.ACTIVITY_FIRST -> BlockPath.ACTIVITY
        BlockStrategy.HOME_NOTIFICATION -> BlockPath.FALLBACK
    }

    /** True when the activity's own resume signal landed within the confirm deadline. */
    fun isConfirmed(attemptAtMs: Long, resumedAtMs: Long): Boolean =
        resumedAtMs >= attemptAtMs && resumedAtMs - attemptAtMs <= CONFIRM_DEADLINE_MS

    /**
     * Resolves the outcome of one activity-path attempt.
     * `launchThrew=true` always resolves to FALLBACK/LAUNCH_ERROR regardless of
     * `confirmed` - a thrown startActivity call never reached the foreground.
     */
    fun resolveActivityAttempt(launchThrew: Boolean, confirmed: Boolean): BlockDecision = when {
        launchThrew -> BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.LAUNCH_ERROR)
        confirmed -> BlockDecision(BlockPath.ACTIVITY, BlockOutcomeReason.CONFIRMED)
        else -> BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.UNCONFIRMED)
    }

    /** The `homeNotification` strategy: always FALLBACK/FORCED. */
    fun forcedFallback(): BlockDecision = BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.FORCED)

    /** The `off` strategy: always NONE/DISABLED. */
    fun disabled(): BlockDecision = BlockDecision(BlockPath.NONE, BlockOutcomeReason.DISABLED)

    /** Debounce gate: true once the in-flight window for this package has elapsed. */
    fun shouldAttempt(nowMs: Long, inFlightUntilMs: Long): Boolean = nowMs >= inFlightUntilMs

    /**
     * Back-press invariant for [BlockActivity] (CR-01): the block screen must
     * always send the user home on back press, on every SDK level, and must
     * never defer to `super.onBackPressed()`. `BlockActivity`'s own
     * `OnBackInvokedCallback` (registered for API 33+) is never invoked by
     * the system while `android:enableOnBackInvokedCallback="false"` is set
     * app-wide (app.json's `predictiveBackGestureEnabled: false`) - back
     * navigation always reaches the legacy `onBackPressed()` path instead, on
     * every SDK level, not just below 33. A hardcoded `true`, pure and
     * pinned by a JVM unit test, so a future regression that reintroduces an
     * SDK_INT branch here is caught without a device/emulator (no
     * Robolectric dependency in this module to unit-test the Activity path
     * itself).
     */
    fun alwaysGoHomeOnBackPress(): Boolean = true
}
