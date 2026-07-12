import { NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';

export async function POST(request: Request) {
  try {
    const { title, message, priority } = await request.json();

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required.' },
        { status: 400 }
      );
    }

    // 1. Sliding Window Rate Limiting using Upstash Redis (if configured)
    let rateLimitExceeded = false;
    let currentCount = 0;
    const limit = 5; // Max 5 Slack alerts per minute

    if (redis) {
      const key = 'rate_limit:slack';
      const now = Date.now();
      const windowStart = now - 60000; // 60 seconds sliding window

      try {
        // Remove scores older than 60 seconds
        await redis.zremrangebyscore(key, 0, windowStart);
        
        // Count active requests in current window
        currentCount = await redis.zcard(key);

        if (currentCount >= limit) {
          rateLimitExceeded = true;
        } else {
          // Add current request
          await redis.zadd(key, { score: now, member: `${now}_${Math.random()}` });
          await redis.expire(key, 60);
          currentCount += 1;
        }
      } catch (redisError) {
        console.error('Redis operation failed, falling back to direct notification:', redisError);
      }
    }

    if (rateLimitExceeded) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Slack notifications are throttled to a maximum of ${limit} alerts per minute. Please try again later.`,
        },
        { status: 429 }
      );
    }

    // 2. Dispatch alert to Slack Webhook (if configured)
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      // Determine color based on priority
      let color = '#36a64f'; // green
      if (priority === 'HIGH') color = '#e28743'; // orange
      if (priority === 'CRITICAL') color = '#f44336'; // red

      const slackPayload = {
        attachments: [
          {
            color: color,
            title: `🚨 AssetFlow Alert: ${title}`,
            text: message,
            fields: [
              {
                title: 'Priority',
                value: priority || 'INFO',
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toLocaleString(),
                short: true
              }
            ],
            footer: 'AssetFlow ERP Notification System'
          }
        ]
      };

      const slackResponse = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      });

      if (!slackResponse.ok) {
        console.error('Slack API error:', await slackResponse.text());
        return NextResponse.json(
          { success: false, error: 'Failed to deliver notification to Slack channel.' },
          { status: 502 }
        );
      }
    } else {
      console.log(`[SLACK ALERT MOCK]: Title: ${title} | Message: ${message} | Priority: ${priority}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification processed successfully.',
      rateLimitCount: currentCount,
      redisActive: !!redis,
      slackDelivered: !!slackWebhookUrl
    });

  } catch (error: any) {
    console.error('API Route Slack Alert error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error.' },
      { status: 500 }
    );
  }
}
