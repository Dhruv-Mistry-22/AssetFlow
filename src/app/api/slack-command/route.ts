import { NextResponse } from 'next/server';
import { seedAssets } from '../../../lib/mockData';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const command = formData.get('command') as string;
    const text = (formData.get('text') as string || '').trim();
    const userName = formData.get('user_name') as string;

    console.log(`[SLACK SLASH COMMAND]: ${command} ${text} | Triggered by: ${userName}`);

    const helpResponse = {
      response_type: 'ephemeral',
      text: '🤖 *AssetFlow Slash Command Assistant*',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '👋 Welcome to the *AssetFlow* command utility. Use the following commands:'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '• `/assetflow status [tag]` - Check status, condition, and location of an asset (e.g. `/assetflow status AF-0012`)\n• `/assetflow list` - List all currently available resources.'
          }
        }
      ]
    };

    if (!text) {
      return NextResponse.json(helpResponse);
    }

    const args = text.split(' ');
    const subCommand = args[0].toLowerCase();

    if (subCommand === 'status') {
      const tagInput = (args[1] || '').toUpperCase();
      if (!tagInput) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: '⚠️ Please supply an asset tag. Example: `/assetflow status AF-0012`'
        });
      }

      const asset = seedAssets.find(a => a.assetTag === tagInput);
      if (!asset) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: `❌ Asset with tag *${tagInput}* was not found in the directory.`
        });
      }

      let statusEmoji = '🟢';
      if (asset.status === 'Allocated') statusEmoji = '🔵';
      if (asset.status === 'Under_Maintenance') statusEmoji = '🔧';
      if (asset.status === 'Lost') statusEmoji = '🔴';

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📁 Asset File: ${asset.name} (${asset.assetTag})`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status:*\n${statusEmoji} ${asset.status}`
            },
            {
              type: 'mrkdwn',
              text: `*Condition:*\n⭐ ${asset.condition}`
            },
            {
              type: 'mrkdwn',
              text: `*Location:*\n📍 ${asset.location}`
            },
            {
              type: 'mrkdwn',
              text: `*Current Holder:*\n👤 ${asset.currentHolderName || 'None (Available)'}`
            }
          ]
        }
      ];

      return NextResponse.json({
        response_type: 'in_channel',
        blocks
      });
    }

    if (subCommand === 'list') {
      const availableAssets = seedAssets.filter(a => a.status === 'Available').slice(0, 5);
      
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🟢 Available Assets Directory'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Here are the top available assets in the depot:'
          }
        },
        ...availableAssets.map(a => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${a.name}* (\`${a.assetTag}\`) | Condition: \`${a.condition}\` | Location: \`${a.location}\``
          }
        })),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Showing ${availableAssets.length} of ${seedAssets.filter(a => a.status === 'Available').length} available items.`
            }
          ]
        }
      ];

      return NextResponse.json({
        response_type: 'ephemeral',
        blocks
      });
    }

    return NextResponse.json(helpResponse);

  } catch (error: any) {
    console.error('API Route Slash Command error:', error);
    return NextResponse.json(
      { text: '❌ Internal server error processing the command.' },
      { status: 500 }
    );
  }
}
