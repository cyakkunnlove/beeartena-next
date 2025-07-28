import { NextRequest, NextResponse } from 'next/server';
import { swaggerDocument } from '@/lib/api/swagger';

// Swagger UI HTML
const swaggerUIHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>BEE ART ENA API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .swagger-ui .topbar {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerDocument)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        onComplete: function() {
          console.log("Swagger UI loaded");
        }
      });
    };
  </script>
</body>
</html>
`;

// GET /api/v1/docs - Swagger UI
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  // Return raw OpenAPI spec if requested
  if (format === 'json') {
    return NextResponse.json(swaggerDocument);
  }

  // Return Swagger UI HTML
  return new NextResponse(swaggerUIHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}