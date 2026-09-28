package expo.modules.screenguard

import android.util.Log
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "ScreenGuard"

/**
 * Thrown by `setBlockStrategy` when the JS caller passes a value that is not
 * one of the allowlisted BlockStrategy wire names. Code: ERR_INVALID_BLOCK_STRATEGY.
 */
class InvalidBlockStrategyException(value: String) : CodedException(
  code = "ERR_INVALID_BLOCK_STRATEGY",
  message = "Invalid block strategy \"$value\". Expected one of: off, activityFirst, homeNotification",
  cause = null
)

class ScreenGuardModule : Module() {

  private val store: BlockStrategyStore
    get() {
      val reactContext = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      return BlockStrategyStore(reactContext)
    }

  override fun definition() = ModuleDefinition {
    Name("ScreenGuard")

    AsyncFunction("getBlockStrategy") {
      val strategy = store.get()
      Log.i(TAG, "getBlockStrategy -> ${strategy.wireName}")
      strategy.wireName
    }

    AsyncFunction("setBlockStrategy") { value: String ->
      val strategy = BlockStrategy.fromWireName(value) ?: throw InvalidBlockStrategyException(value)
      store.set(strategy)
      Log.i(TAG, "setBlockStrategy <- ${strategy.wireName}")
    }
  }
}
