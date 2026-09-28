package expo.modules.screenguard

import android.content.Context
import android.util.Log

private const val TAG = "ScreenGuard"
private const val PREFS_NAME = "screen_guard"
private const val KEY_BLOCK_STRATEGY = "block_strategy"

/**
 * The block-launch strategy the ScreenGuard enforcement path uses.
 *
 * `wireName` is the string that crosses the JS <-> Kotlin boundary and is
 * persisted verbatim in SharedPreferences — it must exactly match the
 * TypeScript `BlockStrategy` union in modules/screen-guard/src/blockStrategy.ts.
 */
enum class BlockStrategy(val wireName: String) {
    OFF("off"),
    ACTIVITY_FIRST("activityFirst"),
    HOME_NOTIFICATION("homeNotification");

    companion object {
        fun fromWireName(value: String): BlockStrategy? = entries.firstOrNull { it.wireName == value }
    }
}

/**
 * SharedPreferences-backed persistence for the current [BlockStrategy].
 *
 * File: "screen_guard" (Context.MODE_PRIVATE). Key: "block_strategy".
 * Default: ACTIVITY_FIRST. Writes are synchronous (`commit()`), so a
 * force-stop immediately after a write cannot lose it.
 */
class BlockStrategyStore(private val context: Context) {

    private val prefs get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun get(): BlockStrategy {
        val stored = prefs.getString(KEY_BLOCK_STRATEGY, null) ?: return BlockStrategy.ACTIVITY_FIRST
        val resolved = BlockStrategy.fromWireName(stored)
        if (resolved == null) {
            Log.w(
                TAG,
                "Unknown stored block strategy \"$stored\" - falling back to default ${BlockStrategy.ACTIVITY_FIRST.wireName}"
            )
            return BlockStrategy.ACTIVITY_FIRST
        }
        return resolved
    }

    fun set(strategy: BlockStrategy) {
        prefs.edit().putString(KEY_BLOCK_STRATEGY, strategy.wireName).commit()
    }
}
