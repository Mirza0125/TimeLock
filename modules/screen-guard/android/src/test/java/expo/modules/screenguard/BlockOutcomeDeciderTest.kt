package expo.modules.screenguard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pins the block-path decision invariant from 01-04-PLAN.md
 * `assumption_delta_decision`, encoded in [BlockOutcomeDecider]: every
 * non-disabled attempt resolves to exactly one of [BlockPath.ACTIVITY] or
 * [BlockPath.FALLBACK] - never [BlockPath.NONE] - and an unconfirmed or
 * failed activity attempt always resolves to FALLBACK. This is pinned
 * before Plan 01-07's spike measures real outcomes, so the spike's
 * recorded results come from logic already proven correct at its
 * boundaries.
 */
class BlockOutcomeDeciderTest {

    @Test
    fun `frozen contract constants`() {
        assertEquals(800L, BlockOutcomeDecider.CONFIRM_DEADLINE_MS)
        assertEquals(1500L, BlockOutcomeDecider.DEBOUNCE_MS)
    }

    @Test
    fun `initialPath maps each strategy to its path`() {
        assertEquals(BlockPath.NONE, BlockOutcomeDecider.initialPath(BlockStrategy.OFF))
        assertEquals(BlockPath.ACTIVITY, BlockOutcomeDecider.initialPath(BlockStrategy.ACTIVITY_FIRST))
        assertEquals(BlockPath.FALLBACK, BlockOutcomeDecider.initialPath(BlockStrategy.HOME_NOTIFICATION))
    }

    @Test
    fun `isConfirmed is true at and within the confirm deadline`() {
        assertTrue(BlockOutcomeDecider.isConfirmed(1000L, 1000L))
        assertTrue(BlockOutcomeDecider.isConfirmed(1000L, 1800L))
    }

    @Test
    fun `isConfirmed is false past the deadline or for a stale resume signal`() {
        assertFalse(BlockOutcomeDecider.isConfirmed(1000L, 1801L))
        assertFalse(BlockOutcomeDecider.isConfirmed(1000L, -1L))
    }

    @Test
    fun `resolveActivityAttempt - launch threw always resolves FALLBACK LAUNCH_ERROR`() {
        val threwConfirmed = BlockOutcomeDecider.resolveActivityAttempt(launchThrew = true, confirmed = true)
        val threwUnconfirmed = BlockOutcomeDecider.resolveActivityAttempt(launchThrew = true, confirmed = false)
        assertEquals(BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.LAUNCH_ERROR), threwConfirmed)
        assertEquals(BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.LAUNCH_ERROR), threwUnconfirmed)
    }

    @Test
    fun `resolveActivityAttempt - no throw and confirmed resolves ACTIVITY CONFIRMED`() {
        val decision = BlockOutcomeDecider.resolveActivityAttempt(launchThrew = false, confirmed = true)
        assertEquals(BlockDecision(BlockPath.ACTIVITY, BlockOutcomeReason.CONFIRMED), decision)
    }

    @Test
    fun `resolveActivityAttempt - no throw and not confirmed resolves FALLBACK UNCONFIRMED`() {
        val decision = BlockOutcomeDecider.resolveActivityAttempt(launchThrew = false, confirmed = false)
        assertEquals(BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.UNCONFIRMED), decision)
    }

    @Test
    fun `resolveActivityAttempt never resolves to NONE for any combination`() {
        for (launchThrew in listOf(true, false)) {
            for (confirmed in listOf(true, false)) {
                val decision = BlockOutcomeDecider.resolveActivityAttempt(launchThrew, confirmed)
                assertNotEquals(
                    "launchThrew=$launchThrew confirmed=$confirmed must never resolve to NONE",
                    BlockPath.NONE,
                    decision.path
                )
            }
        }
    }

    @Test
    fun `forcedFallback is always FALLBACK FORCED`() {
        assertEquals(BlockDecision(BlockPath.FALLBACK, BlockOutcomeReason.FORCED), BlockOutcomeDecider.forcedFallback())
    }

    @Test
    fun `disabled is always NONE DISABLED`() {
        assertEquals(BlockDecision(BlockPath.NONE, BlockOutcomeReason.DISABLED), BlockOutcomeDecider.disabled())
    }

    @Test
    fun `shouldAttempt is false before the in-flight window elapses and true once it does`() {
        assertFalse(BlockOutcomeDecider.shouldAttempt(999L, 1000L))
        assertTrue(BlockOutcomeDecider.shouldAttempt(1000L, 1000L))
    }
}
