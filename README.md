# mcp-see

An MCP server that gives AI agents eyes - the ability to observe and understand images without stuffing raw pixels into their context window.

## Features

- **Multi-provider vision**: Describe images using Gemini, OpenAI, or Claude
- **Object detection**: Find objects with bounding boxes (Gemini)
- **Hierarchical analysis**: Detect regions, then zoom in for detail
- **Precise color extraction**: K-Means clustering in LAB color space
- **Color naming**: Human-readable color names via color.pizza API
- **URL support**: Analyze images directly from the web (http/https)

## Installation

Run directly from GitHub with npx:

```bash
npx github:simen/mcp-see
```

Or clone and build locally:

```bash
git clone https://github.com/simen/mcp-see.git
cd mcp-see
npm install
npm run build
```

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "mcp-see": {
      "command": "npx",
      "args": ["github:simen/mcp-see"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "OPENAI_API_KEY": "sk-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Other MCP Clients

The server runs on stdio transport. Configure your client to spawn `npx github:simen/mcp-see`.

## Tools

### `describe`

Get an AI-generated description of an image.

**Input:**
```json
{
  "image": "/path/to/image.png or https://example.com/image.jpg",
  "prompt": "What is shown in this image?",
  "provider": "gemini",
  "detail": "detailed"
}
```

**Example Output:**
```
The image shows a vibrant and colorful salad bowl, viewed from directly above.
The bowl is made of a light brown, possibly biodegradable material. The salad
is composed of various ingredients arranged in distinct sections: two small
white peeled eggs, sliced red tomatoes topped with chopped green onions, cubed
seasoned tofu, bright green edamame beans, shredded purple cabbage, and
julienned carrots...
```

### `detect`

Detect objects and return bounding boxes. Uses Gemini for native bbox support.

**Input:**
```json
{
  "image": "/path/to/image.png",
  "prompt": "find all TV screens"
}
```

**Example Output:**
```json
{
  "count": 3,
  "objects": [
    { "id": 1, "label": "television", "bbox": [178, 245, 433, 818] },
    { "id": 2, "label": "television", "bbox": [614, 518, 792, 898] },
    { "id": 3, "label": "television", "bbox": [617, 198, 792, 493] }
  ]
}
```

Coordinates are `[ymin, xmin, ymax, xmax]` normalized 0-1000.

### `describe_region`

Crop to a bounding box and describe that region in detail.

**Input:**
```json
{
  "image": "/path/to/image.png",
  "bbox": [200, 200, 800, 800],
  "prompt": "describe this in detail",
  "provider": "gemini"
}
```

**Example Output:**
```json
{
  "bbox": [200, 200, 800, 800],
  "description": "The image showcases a vibrant and colorful salad bowl in close-up. The bowl contains fresh ingredients including cubed tofu with a seasoned exterior, bright green edamame, sliced tomatoes, and shredded purple cabbage..."
}
```

### `analyze_colors`

Extract dominant colors from a region using K-Means clustering in LAB color space.

**Input:**
```json
{
  "image": "/path/to/image.png",
  "bbox": [100, 200, 400, 600],
  "top": 5
}
```

**Example Output:**
```json
{
  "dominant": [
    {
      "hex": "#e6e6e5",
      "rgb": [230, 230, 229],
      "hsl": { "h": 60, "s": 2, "l": 90 },
      "name": "Ambience White",
      "percentage": 75.91
    },
    {
      "hex": "#b16c39",
      "rgb": [177, 108, 57],
      "hsl": { "h": 26, "s": 51, "l": 46 },
      "name": "Ginger Dough",
      "percentage": 15.91
    }
  ],
  "average": {
    "hex": "#c4b8a8",
    "rgb": [196, 184, 168],
    "name": "Doeskin"
  },
  "confidence": "high",
  "region": {
    "bbox": [100, 200, 400, 600],
    "size": [200, 150],
    "totalPixels": 30000
  }
}
```

The `confidence` field indicates color precision:
- `high`: Flat colors (UI elements) - clusters are tight
- `medium`: Mixed content
- `low`: Photographs/gradients - colors are approximate

## Workflows

### Hierarchical Image Understanding

The power of mcp-see is in combining tools for progressive analysis:

```
1. describe(image)
   → "A shelf displaying various vintage electronics and TVs"

2. detect(image, "find all screens")
   → [{label: "television", bbox: [178, 245, 433, 818]}, ...]

3. describe_region(image, [178, 245, 433, 818])
   → "A vintage CRT television with wood grain casing, displaying
      a test pattern. The screen shows horizontal color bars..."

4. analyze_colors(image, [178, 245, 433, 818])
   → dominant: ["#2b1810" Espresso Bean, "#c4a882" Sandcastle, ...]
```

### Design Reference Analysis

Extract implementation-ready specs from design mockups:

```
1. describe(image, "explain this UI to a web developer")
   → Layout structure, component hierarchy, spacing patterns

2. detect(image, "find all buttons")
   → Bounding boxes for each button

3. For each button:
   - describe_region() → Button label, icon, state
   - analyze_colors() → Exact color tokens for CSS
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID for Vertex AI | For Gemini |
| `OPENAI_API_KEY` | OpenAI API key | For OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic API key | For Claude provider |

Gemini uses Google Cloud Application Default Credentials (ADC). Run `gcloud auth application-default login` to authenticate.

## Technical Details

### Color Extraction Algorithm

The `analyze_colors` tool uses K-Means clustering in LAB color space:

1. Convert pixels from RGB to LAB (perceptually uniform)
2. Subsample to 50k pixels for performance
3. K-Means++ initialization for better convergence
4. Cluster centroids become dominant colors
5. Convert back to RGB, name via color.pizza API

This approach groups perceptually similar colors together, working well for both flat UI colors and noisy photographs.

### Bounding Box Format

All bounding boxes use `[ymin, xmin, ymax, xmax]` format with coordinates normalized to 0-1000. To convert to pixel coordinates:

```javascript
const pixelX = (normalizedX / 1000) * imageWidth;
const pixelY = (normalizedY / 1000) * imageHeight;
```

## License

MIT
