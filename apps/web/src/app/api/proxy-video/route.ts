import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const videoFeedUrl = 'https://hachicctv.aadil.site/video_feed';
  
  try {
    const response = await fetch(videoFeedUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'multipart/x-mixed-replace, image/jpeg, video/*',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch video feed: ${response.status} ${response.statusText}`);
      return new Response('Failed to fetch video feed', { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'multipart/x-mixed-replace';
    console.log('[Proxy] Content-Type:', contentType);

    // Get the response as a stream
    const stream = response.body;
    
    if (!stream) {
      return new Response('No video stream available', { status: 500 });
    }

    // Return the stream with proper CORS headers
    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Failed to proxy video feed', { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
