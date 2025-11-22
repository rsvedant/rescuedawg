# VAPI Integration Setup Guide

## 🔧 Environment Variables

Add these to your `.env` files:

### Frontend (`apps/web/.env`)
```bash
# VAPI Web SDK
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_public_key_here
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id_here
```

### Backend (`packages/backend/.env`)
```bash
# VAPI Private Key (for server-side operations)
VAPI_PRIVATE_API_KEY=your_private_key_here
```

## 📍 Webhook URL

Set this in your VAPI Dashboard → Assistant Settings → Server URL:

```
https://fearless-guineapig-482.convex.site/vapi-webhook
```

**Important**: Use `.convex.site` NOT `.convex.cloud`

## 🎨 VAPI Assistant Configuration

### 1. Create Assistant in VAPI Dashboard

**Basic Settings:**
- Name: `Emergency Info Collector`
- First Message: `Hello, this is RescueDawg AI Emergency Response. I need to gather critical information to dispatch help immediately. Are you safe to talk?`
- Model: `gpt-4o` or `gpt-4o-mini`
- Temperature: `0.3` (for consistent responses)

**Voice:**
- Provider: `11labs`
- Voice ID: `21m00Tcm4TlvDq8ikWAM` (Rachel - calm, professional)

**Transcriber:**
- Provider: `deepgram`
- Model: `nova-2`

### 2. Add Custom Tool: `submitReport`

In VAPI Dashboard → Tools → Create Function Tool:

```json
{
  "type": "function",
  "function": {
    "name": "submitReport",
    "description": "Submit the collected emergency information and end the call",
    "parameters": {
      "type": "object",
      "properties": {
        "locationConfirmed": {
          "type": "string",
          "description": "Confirmed address or location details"
        },
        "peopleAffected": {
          "type": "number",
          "description": "Number of people affected or injured"
        },
        "currentStatus": {
          "type": "string",
          "description": "Current situation status (spreading, stable, contained, etc.)"
        },
        "immediateHazards": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of immediate hazards present"
        },
        "additionalInfo": {
          "type": "string",
          "description": "Any other critical details"
        }
      },
      "required": ["locationConfirmed", "peopleAffected", "currentStatus"]
    }
  }
}
```

**Server Configuration:**
- Server URL: `https://fearless-guineapig-482.convex.site/vapi-webhook`
- Method: `POST`

### 3. Add System Prompt

The system prompt will be dynamically injected from the backend, but you can set a base prompt:

```
You are an emergency information collector for RescueDawg AI Emergency Response System.

YOUR MISSION:
1. Confirm the emergency situation with the person on scene
2. Gather critical details:
   - Exact location/address confirmation
   - Number of people affected/injured
   - Current status (spreading, worsening, stable)
   - Any immediate hazards (gas leaks, structural damage, weapons, etc.)
   
3. Keep the caller calm and focused
4. Be brief - every second counts
5. After collecting all info, use the submitReport tool

COMMUNICATION STYLE:
- Clear, calm, authoritative
- Ask ONE question at a time
- Don't panic the caller
- Prioritize life-safety info first
```

### 4. Variable Values

The assistant will receive these dynamic variables per call:
- `incidentId` - The Convex incident ID
- `emergencyType` - Type of emergency (fire, medical, etc.)
- `confidence` - AI detection confidence (0.85-1.0)

## 🔄 Complete Workflow

```
1. CV Detection (Gemini 2.0 Flash)
   ↓ High confidence emergency (>85%)
   
2. Create Incident (Convex)
   - incidentNumber: "AI-123456"
   - description: "AI DETECTED FIRE..."
   
3. Prepare VAPI Context (Backend)
   - prepareEmergencyContext() action
   - Returns: incidentId, emergency data, system prompt
   
4. VAPI Web Call Starts (Frontend)
   - User clicks microphone button
   - Browser requests mic permission
   - Web SDK connects to VAPI
   
5. Bystander Interview
   AI: "Are you safe?"
   Human: "Yes, small kitchen fire..."
   AI: "How many people are affected?"
   Human: "Just me, I'm using a fire extinguisher..."
   
6. Submit Report Tool Called
   {
     "locationConfirmed": "123 Main St, Apt 4B",
     "peopleAffected": 1,
     "currentStatus": "contained, using extinguisher",
     "immediateHazards": ["smoke inhalation risk"],
     "additionalInfo": "fire started from stove"
   }
   
7. Webhook → Convex (/vapi-webhook)
   - Receives tool-calls event
   - Updates incident with collected data
   
8. Call Ends
   - end-of-call-report event
   - Full transcript saved to incident
   
9. Grok Analysis (xai/grok-4-fast-reasoning)
   - Synthesizes CV detection + VAPI data
   - Updates: incidentType, severity, priority
   - Enhanced aiAnalysis with both sources
```

## 🧪 Testing

### 1. Start Dev Servers
```bash
# Terminal 1: Backend
cd packages/backend
bunx convex dev

# Terminal 2: Frontend
cd apps/web
bun run dev
```

### 2. Test Flow
1. Go to `http://localhost:3000/stream`
2. Allow camera access
3. Show emergency to camera (e.g., picture of fire)
4. Wait for detection (check console logs)
5. VAPI button appears → Click to start call
6. Allow microphone access
7. Speak to AI assistant
8. Watch incident update in Convex dashboard

### 3. Check Logs

**Convex Logs:**
```bash
cd packages/backend
bunx convex logs
```

**Browser Console:**
- `[VAPI Webhook]` events
- `[Stream]` detection logs
- WebRTC connection status

## 🔍 Troubleshooting

### Webhook Not Receiving Events
- Check Server URL in VAPI Dashboard uses `.convex.site`
- Verify assistant has Server URL configured
- Check Convex logs for incoming requests

### incidentId Not Found
- Ensure `variableValues.incidentId` is passed in `assistantOverrides`
- Check browser console for VAPI SDK errors
- Verify `prepareEmergencyContext` action runs successfully

### Audio Not Working
- Grant microphone permissions in browser
- Check VAPI public key is correct
- Verify assistant ID exists in dashboard

### Tool Not Being Called
- Ensure `submitReport` tool is added to assistant
- Check tool function name matches exactly
- Verify required parameters are provided

## 📚 References

- [VAPI Web SDK Docs](https://docs.vapi.ai/quickstart/web)
- [VAPI Webhooks](https://docs.vapi.ai/server-url/events)
- [Convex HTTP Routes](https://docs.convex.dev/functions/http-actions)
