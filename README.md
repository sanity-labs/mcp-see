# mcp-see

An MCP server that gives AI agents eyes - the ability to observe and understand images without stuffing raw pixels into their context window.

## Features

- **Multi-provider vision**: Describe images using Gemini, OpenAI, or Claude
- **Object detection**: Find objects with bounding boxes (Gemini)
- **Hierarchical analysis**: Detect regions, then zoom in for detail
- **Precise color extraction**: K-Means clustering in LAB color space
- **Color naming**: Human-readable color names via color.pizza API

## Installation

```bash
npx mcp-see
```

Or install globally:

```bash
npm install -g mcp-see
```

## Tools

### `describe`
Get an AI-generated description of an image.

```json
{
  "image": "/path/to/image.png",
  "prompt": "What is shown in this image?",
  "provider": "gemini",
  "detail": "detailed"
}
```

### `detect`
Detect objects and return bounding boxes (Gemini only).

```json
{
  "image": "/path/to/image.png",
  "prompt": "find all buttons"
}
```

Returns coordinates as `[ymin, xmin, ymax, xmax]` normalized 0-1000.

### `describe_region`
Crop to a bounding box and describe that region in detail.

```json
{
  "image": "/path/to/image.png",
  "bbox": [100, 200, 400, 600],
  "prompt": "describe this UI component"
}
```

### `analyze_colors`
Extract dominant colors from a region using K-Means clustering.

```json
{
  "image": "/path/to/image.png",
  "bbox": [100, 200, 400, 600],
  "top": 5
}
```

Returns colors with hex, RGB, HSL, percentage, and human-readable names.

### `get_pixel`
Get exact color at specific coordinates.

```json
{
  "image": "/path/to/image.png",
  "x": 100,
  "y": 200
}
```

## Configuration

Set environment variables for vision providers:

```bash
# Gemini/Vertex AI (uses gcloud ADC by default)
export GOOGLE_CLOUD_PROJECT=your-project-id

# OpenAI
export OPENAI_API_KEY=sk-...

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...
```

## Workflows

### Hierarchical Image Understanding

1. `describe(image)` → high-level overview
2. `detect(image)` → find objects/regions of interest
3. `describe_region(image, bbox)` → detailed analysis of specific area
4. `analyze_colors(image, bbox)` → extract precise colors from region

### Design Reference Analysis

1. `describe(image, "explain this UI to a web developer")`
2. `detect(image, "find all UI components")`
3. For each component:
   - `describe_region()` for implementation details
   - `analyze_colors()` for exact color tokens

## License

MIT
