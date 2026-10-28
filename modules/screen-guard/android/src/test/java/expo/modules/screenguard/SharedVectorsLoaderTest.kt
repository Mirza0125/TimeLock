package expo.modules.screenguard

import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Loads `rule-evaluation.json` on the JUnit/JVM test classpath (wired via
 * `android.sourceSets.test.resources.srcDir` in build.gradle, pointing at
 * `modules/screen-guard/shared-test-vectors/` - the SAME file Jest reads,
 * never a copy) and re-checks the internal-consistency rules the TS-side
 * validator (`modules/screen-guard/src/ruleEvaluationVectors.ts`) enforces.
 *
 * NOTE: `java.time` is used here because this is JVM-only test code. It is
 * NOT available on minSdk 24 without core-library desugaring, so production
 * Kotlin (main source set) must not import `java.time` directly.
 */
class SharedVectorsLoaderTest {

    /** Mirrors TS `REQUIRED_VECTOR_TAGS` (modules/screen-guard/src/ruleEvaluationVectors.ts). */
    private val requiredTags = setOf(
        "baseline",
        "allowlist",
        "daily-under",
        "daily",
        "disabled",
        "days",
        "per-day",
        "group",
        "schedule",
        "schedule-midnight",
        "schedule-allowlist",
        "schedule-outside",
        "opens-boundary",
        "opens",
        "session-boundary",
        "session",
        "grant",
        "grant-expired",
        "grant-schedule-child",
        "precedence"
    )

    private val validRuleTypes = setOf("daily", "group", "schedule", "session", "openCount")
    private val validBlockReasons = setOf("schedule", "daily", "opens", "session")

    private val isoFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT)
            .withZone(ZoneOffset.UTC)

    private fun isoOf(epochMs: Long): String = isoFormatter.format(Instant.ofEpochMilli(epochMs))

    private fun loadVectorsJson(): JSONObject {
        val stream = javaClass.classLoader
            ?.getResourceAsStream("rule-evaluation.json")
        assertNotNull("rule-evaluation.json must be found on the test classpath", stream)
        val text = stream!!.bufferedReader().readText()
        return JSONObject(text)
    }

    @Test
    fun `resource is found on the test classpath`() {
        val root = loadVectorsJson()
        assertTrue(root.has("vectors"))
    }

    @Test
    fun `schemaVersion is 1 and there are exactly 21 vectors with unique ids`() {
        val root = loadVectorsJson()
        assertEquals(1, root.getInt("schemaVersion"))

        val vectors = root.getJSONArray("vectors")
        assertEquals(21, vectors.length())

        val seenIds = mutableSetOf<String>()
        for (i in 0 until vectors.length()) {
            val id = vectors.getJSONObject(i).getString("id")
            assertTrue("duplicate vector id: $id", seenIds.add(id))
        }
    }

    @Test
    fun `every nowIso equals the UTC rendering of input nowMs`() {
        val vectors = loadVectorsJson().getJSONArray("vectors")
        for (i in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(i)
            val id = vector.getString("id")
            val nowMs = vector.getJSONObject("input").getLong("nowMs")
            val expected = isoOf(nowMs)
            assertEquals("vector \"$id\": nowIso mismatch", expected, vector.getString("nowIso"))
        }
    }

    @Test
    fun `every expected decision is allow or block`() {
        val vectors = loadVectorsJson().getJSONArray("vectors")
        for (i in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(i)
            val id = vector.getString("id")
            val decision = vector.getJSONObject("expected").getString("decision")
            assertTrue(
                "vector \"$id\": decision must be allow or block, got $decision",
                decision == "allow" || decision == "block"
            )
        }
    }

    @Test
    fun `every block vector has a valid reason, non-empty ruleId, untilMs, and matching expectedUntilIso`() {
        val vectors = loadVectorsJson().getJSONArray("vectors")
        for (i in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(i)
            val id = vector.getString("id")
            val expected = vector.getJSONObject("expected")
            if (expected.getString("decision") != "block") continue

            val reason = expected.getString("reason")
            assertTrue(
                "vector \"$id\": reason \"$reason\" not in $validBlockReasons",
                validBlockReasons.contains(reason)
            )

            val ruleId = expected.optString("ruleId", "")
            assertFalse("vector \"$id\": ruleId must be non-empty", ruleId.isEmpty())

            val untilMs = expected.getLong("untilMs")
            val expectedIso = isoOf(untilMs)
            val expectedUntilIso = vector.optString("expectedUntilIso", "")
            assertEquals(
                "vector \"$id\": expectedUntilIso mismatch",
                expectedIso,
                expectedUntilIso
            )
        }
    }

    @Test
    fun `every rule type is one of the known rule types`() {
        val vectors = loadVectorsJson().getJSONArray("vectors")
        for (i in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(i)
            val id = vector.getString("id")
            val rules: JSONArray = vector.getJSONObject("input").getJSONArray("rules")
            for (j in 0 until rules.length()) {
                val type = rules.getJSONObject(j).getString("type")
                assertTrue(
                    "vector \"$id\": rules[$j].type \"$type\" not in $validRuleTypes",
                    validRuleTypes.contains(type)
                )
            }
        }
    }

    @Test
    fun `every required tag appears on at least one vector`() {
        val vectors = loadVectorsJson().getJSONArray("vectors")
        val seenTags = mutableSetOf<String>()
        for (i in 0 until vectors.length()) {
            val tags = vectors.getJSONObject(i).getJSONArray("tags")
            for (j in 0 until tags.length()) {
                seenTags.add(tags.getString(j))
            }
        }
        for (tag in requiredTags) {
            assertTrue("no vector covers required tag \"$tag\"", seenTags.contains(tag))
        }
    }
}
