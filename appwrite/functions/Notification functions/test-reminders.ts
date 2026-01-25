/**
 * Local test script for Event Reminders functionality
 * 
 * This script helps you test the event reminder logic locally before deploying
 * 
 * Usage:
 * 1. Copy .env.example to .env and fill in your Appwrite credentials
 * 2. Run: npm run test:reminders
 */

import { Client, Databases, Query } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

// Constants
const DATABASE_ID = '69217af50038b9005a61';
const USER_PROFILES_TABLE_ID = 'user_profiles';
const EVENTS_TABLE_ID = 'events';

interface SavedEventData {
  eventId: string;
  addedAt: string;
  reminder24hSent?: boolean;
  reminder1hSent?: boolean;
}

interface UserProfile {
  $id: string;
  authID: string;
  savedEventIds?: string;
  [key: string]: unknown;
}

interface Event {
  $id: string;
  name: string;
  date: string;
  startTime: string;
  city: string;
  address: string;
  [key: string]: unknown;
}

async function testEventReminders() {
  console.log('🧪 Testing Event Reminders Functionality\n');

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '691d4a54003b21bf0136')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const databases = new Databases(client);

  try {
    // Test 1: Check if we can access the database
    console.log('✓ Test 1: Database Connection');
    const eventsResponse = await databases.listDocuments(
      DATABASE_ID,
      EVENTS_TABLE_ID,
      [Query.limit(1)]
    );
    console.log(`  ✓ Successfully connected to database`);
    console.log(`  ✓ Found ${eventsResponse.total} events in database\n`);

    // Test 2: Find upcoming events
    console.log('✓ Test 2: Finding Upcoming Events');
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

    // Fetch all events
    const allEventsResponse = await databases.listDocuments(
      DATABASE_ID,
      EVENTS_TABLE_ID,
      []
    );
    const events = allEventsResponse.documents as unknown as Event[];

    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  24h window: ${in24Hours.toISOString()}`);
    console.log(`  1h window: ${in1Hour.toISOString()}`);
    console.log(`  Total events: ${events.length}\n`);

    // Define time windows (±15 minutes)
    const time24hStart = new Date(in24Hours.getTime() - 15 * 60 * 1000);
    const time24hEnd = new Date(in24Hours.getTime() + 15 * 60 * 1000);
    const time1hStart = new Date(in1Hour.getTime() - 15 * 60 * 1000);
    const time1hEnd = new Date(in1Hour.getTime() + 15 * 60 * 1000);

    // Note: With user-level tracking, we check users instead of just event flags
    console.log('  (Note: Using user-level tracking - checking individual user reminder flags)\n');

    // Test 3: Check users with saved events
    console.log('✓ Test 3: Checking Users with Saved Events');
    const usersResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      []
    );
    const users = usersResponse.documents as unknown as UserProfile[];

    let usersWithSavedEvents = 0;
    let totalSavedEvents = 0;

    for (const user of users) {
      if (user.savedEventIds) {
        try {
          const savedEvents: SavedEventData[] = JSON.parse(user.savedEventIds);
          if (savedEvents.length > 0) {
            usersWithSavedEvents++;
            totalSavedEvents += savedEvents.length;
            
            console.log(`  👤 User ${user.$id}:`);
            console.log(`     Auth ID: ${user.authID}`);
            console.log(`     Saved events: ${savedEvents.length}`);
            
            // Show reminder status for each saved event
            savedEvents.forEach(saved => {
              console.log(`     - Event ${saved.eventId}:`);
              console.log(`       24h sent: ${saved.reminder24hSent || false}, 1h sent: ${saved.reminder1hSent || false}`);
            });
            console.log('');
          }
        } catch {
          console.log(`  ⚠️  Error parsing savedEventIds for user ${user.$id}`);
        }
      }
    }

    console.log(`  Summary: ${usersWithSavedEvents} users with saved events (${totalSavedEvents} total)\n`);

    // Test 4: Simulate reminder matching (User-level tracking)
    console.log('✓ Test 4: Simulating User-Level Reminder Matching');
    
    for (const event of events) {
      const eventDate = new Date(event.startTime || event.date);

      // Check if event is in any time window
      const in24hWindow =
        eventDate >= time24hStart &&
        eventDate <= time24hEnd;

      const in1hWindow =
        eventDate >= time1hStart &&
        eventDate <= time1hEnd;

      if (in24hWindow || in1hWindow) {
        // Find users who have this event saved and haven't received reminder
        const users24h: string[] = [];
        const users1h: string[] = [];

        for (const user of users) {
          if (user.savedEventIds) {
            try {
              const savedEvents: SavedEventData[] = JSON.parse(user.savedEventIds);
              const savedEvent = savedEvents.find(saved => saved.eventId === event.$id);
              
              if (savedEvent && user.authID) {
                // Check if user needs 24h reminder
                if (in24hWindow && !savedEvent.reminder24hSent) {
                  users24h.push(user.authID);
                }
                
                // Check if user needs 1h reminder
                if (in1hWindow && !savedEvent.reminder1hSent) {
                  users1h.push(user.authID);
                }
              }
            } catch {
              // Skip
            }
          }
        }

        if (users24h.length > 0) {
          console.log(`  📬 Would send 24h reminder:`);
          console.log(`     Event: ${event.name}`);
          console.log(`     Recipients: ${users24h.length} users`);
          console.log(`     Auth IDs: ${users24h.join(', ')}\n`);
        }

        if (users1h.length > 0) {
          console.log(`  📬 Would send 1h reminder:`);
          console.log(`     Event: ${event.name}`);
          console.log(`     Recipients: ${users1h.length} users`);
          console.log(`     Auth IDs: ${users1h.join(', ')}\n`);
        }
      }
    }

    console.log('✅ All tests completed successfully!\n');

    // Calculate actual numbers for summary
    let total24hReminders = 0;
    let total1hReminders = 0;

    for (const event of events) {
      const eventDate = new Date(event.startTime || event.date);
      
      if (eventDate >= time24hStart && eventDate <= time24hEnd) {
        for (const user of users) {
          if (user.savedEventIds) {
            try {
              const savedEvents: SavedEventData[] = JSON.parse(user.savedEventIds);
              const savedEvent = savedEvents.find(saved => saved.eventId === event.$id);
              if (savedEvent && !savedEvent.reminder24hSent) {
                total24hReminders++;
              }
            } catch {
              // Skip
            }
          }
        }
      }
      
      if (eventDate >= time1hStart && eventDate <= time1hEnd) {
        for (const user of users) {
          if (user.savedEventIds) {
            try {
              const savedEvents: SavedEventData[] = JSON.parse(user.savedEventIds);
              const savedEvent = savedEvents.find(saved => saved.eventId === event.$id);
              if (savedEvent && !savedEvent.reminder1hSent) {
                total1hReminders++;
              }
            } catch {
              // Skip
            }
          }
        }
      }
    }

    // Test Summary
    console.log('📊 Summary:');
    console.log(`   - User-reminder pairs needing 24h reminder: ${total24hReminders}`);
    console.log(`   - User-reminder pairs needing 1h reminder: ${total1hReminders}`);
    console.log(`   - Users with saved events: ${usersWithSavedEvents}`);
    console.log(`   - Total saved events: ${totalSavedEvents}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testEventReminders();
