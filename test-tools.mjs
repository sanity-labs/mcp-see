/**
 * Quick smoke test for all tools
 */

import { handleDescribe } from "./dist/tools/describe.js";
import { handleDetect } from "./dist/tools/detect.js";
import { handleDescribeRegion } from "./dist/tools/describe-region.js";
import { handleAnalyzeColors } from "./dist/tools/analyze-colors.js";
import { handleGetPixel } from "./dist/tools/get-pixel.js";

const TEST_IMAGE = "/private/tmp/powpow/see-mcp--lead/test_image.jpg";
const TVS_IMAGE = "/private/tmp/powpow/see-mcp--lead/tvs.png";

async function test(name, fn) {
  console.log(`\n=== Testing ${name} ===`);
  try {
    const result = await fn();
    console.log("✅ Success");
    if (result.content?.[0]?.text) {
      const text = result.content[0].text;
      // Truncate long outputs
      console.log(text.length > 500 ? text.slice(0, 500) + "..." : text);
    }
    return true;
  } catch (err) {
    console.log("❌ Error:", err.message);
    return false;
  }
}

async function main() {
  console.log("MCP-See Smoke Tests\n");

  const results = [];

  // Test get_pixel (no API needed)
  results.push(await test("get_pixel", () =>
    handleGetPixel({ image: TEST_IMAGE, x: 100, y: 100 })
  ));

  // Test analyze_colors (no API needed)
  results.push(await test("analyze_colors (full image)", () =>
    handleAnalyzeColors({ image: TEST_IMAGE, top: 3 })
  ));

  // Test analyze_colors with bbox
  results.push(await test("analyze_colors (region)", () =>
    handleAnalyzeColors({ image: TEST_IMAGE, bbox: [0, 0, 500, 500], top: 3 })
  ));

  // Test describe (requires Gemini API)
  results.push(await test("describe", () =>
    handleDescribe({ image: TEST_IMAGE, detail: "brief" })
  ));

  // Test detect (requires Gemini API)
  results.push(await test("detect", () =>
    handleDetect({ image: TVS_IMAGE, prompt: "find all TV screens" })
  ));

  // Test describe_region (requires Gemini API)
  results.push(await test("describe_region", () =>
    handleDescribeRegion({ image: TEST_IMAGE, bbox: [200, 200, 800, 800] })
  ));

  console.log("\n=== Summary ===");
  const passed = results.filter(r => r).length;
  console.log(`${passed}/${results.length} tests passed`);
}

main().catch(console.error);
