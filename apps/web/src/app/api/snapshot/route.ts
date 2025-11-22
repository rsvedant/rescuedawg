import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const videoFeedUrl = 'https://hachicctv.aadil.site/video_feed';
  
  try {
    const response = await fetch(videoFeedUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch video feed: ${response.status} ${response.statusText}`);
      return new Response('Failed to fetch video feed', { status: response.status });
    }

    // For MJPEG streams, we need to read the first frame
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('multipart/x-mixed-replace')) {
      // Parse MJPEG stream to get first frame
      const reader = response.body?.getReader();
      if (!reader) {
        return new Response('No stream available', { status: 500 });
      }

      let buffer = new Uint8Array(0);
      let foundFrame = false;

      // Read chunks until we find a complete JPEG frame
      while (!foundFrame) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new data to buffer
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Look for JPEG markers (FFD8 = start, FFD9 = end)
        const jpegStart = buffer.findIndex((byte, i) => 
          byte === 0xFF && buffer[i + 1] === 0xD8
        );
        const jpegEnd = buffer.findIndex((byte, i) => 
          byte === 0xFF && buffer[i + 1] === 0xD9
        );

        if (jpegStart !== -1 && jpegEnd !== -1 && jpegEnd > jpegStart) {
          // Extract the JPEG frame
          const frame = buffer.slice(jpegStart, jpegEnd + 2);
          reader.cancel();
          
          return new Response(frame, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache',
            },
          });
        }
      }

      reader.cancel();
      return new Response('No frame found', { status: 500 });
    } else {
      // If it's already a single image, just return it
      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('Snapshot error:', error);
    return new Response('Failed to capture snapshot', { status: 500 });
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
