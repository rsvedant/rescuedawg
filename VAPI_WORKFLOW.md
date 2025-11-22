# VAPI Emergency Response Workflow

## 🔥 Complete Flow with Transient Assistant

### 1. Emergency Detection (CV)
```
Gemini 2.0 Flash analyzes video frame
↓
Detects fire with 92% confidence
↓
Creates incident: "AI-123456"
↓
Returns incidentId to frontend
```

### 2. VAPI Call Initiation (Transient Assistant)

**Frontend triggers:**
```typescript
vapi.start(assistantId, {
  // TRANSIENT OVERRIDES - Dynamic per call
  variableValues: {
    incidentId: "cm5abc123",
    emergencyType: "fire",
    confidence: "92",
    description: "flames visible in kitchen",
    severity: "high"
  },
  firstMessage: "Hello, this is RescueDawg AI...",
  model: {
    messages: [{
      role: "system",
      content: `EMERGENCY CONTEXT:
        - Type: fire
        - Confidence: 92%
        - Description: flames visible
        ...`
    }]
  }
});
```

**Key Point:** This is a **transient configuration** - the emergency context is embedded directly in the call, not stored in VAPI dashboard.

### 3. Bystander Interview
```
AI: "We've detected a fire emergency. Are you safe?"
Human: "Yes, I'm using a fire extinguisher"

AI: "What's your exact location?"
Human: "123 Main St, Apartment 4B"

AI: "How many people are affected?"
Human: "Just me, but my neighbor might not know"
```

### 4. Tool Call: submitReport
```json
{
  "name": "submitReport",
  "parameters": {
    "locationConfirmed": "123 Main St, Apt 4B",
    "peopleAffected": 1,
    "currentStatus": "contained with extinguisher",
    "immediateHazards": ["smoke inhalation", "possible spread to neighbor"],
    "additionalInfo": "kitchen stove fire, small but needs professional check"
  }
}
```

### 5. Webhook Processing
```
POST https://fearless-guineapig-482.convex.site/vapi-webhook

{
  "message": {
    "type": "tool-calls",
    "toolCallList": [{
      "name": "submitReport",
      "parameters": { /* collected data */ }
    }],
    "call": {
      "assistantOverrides": {
        "variableValues": {
          "incidentId": "cm5abc123"  // Extract this!
        }
      }
    }
  }
}
```

**Convex extracts:**
- `incidentId` from `message.call.assistantOverrides.variableValues.incidentId`
- Updates incident with collected data

### 6. Call End & Transcript
```
POST /vapi-webhook

{
  "message": {
    "type": "end-of-call-report",
    "artifact": {
      "transcript": "Full conversation...",
      "messages": [...]
    },
    "call": {
      "assistantOverrides": {
        "variableValues": {
          "incidentId": "cm5abc123"
        }
      }
    }
  }
}
```

**Convex actions:**
1. Save transcript to incident
2. Trigger Grok analysis

### 7. Grok Synthesis
```
xai/grok-4-fast-reasoning receives:

CV DATA:
- "AI DETECTED FIRE: flames visible in kitchen area..."
- Confidence: 92%
- Timestamp: 2024-01-15 14:23:00

VAPI DATA:
- Location: "123 Main St, Apt 4B"
- Status: "contained with extinguisher"
- People affected: 1
- Hazards: ["smoke inhalation", "possible spread"]
- Bystander notes: "small kitchen stove fire"

OUTPUT:
- incidentType: "fire"
- severity: 3 (reduced from 5 due to "contained" status)
- priority: "MEDIUM"
- aiAnalysis: "[SYNTHESIZED] AI detected fire with 92% confidence.
  Bystander confirmed kitchen stove fire at 123 Main St Apt 4B.
  Currently contained with extinguisher. 1 person safe but smoke
  inhalation risk present. Recommend: fire dept inspection,
  ventilation check, neighbor notification."
```

## 🎯 Why Transient Configuration?

### ❌ **Without Transient (Wrong Way)**
```typescript
// Create permanent assistant for EVERY emergency
const assistant = await vapi.assistants.create({
  name: "Fire Emergency cm5abc123",
  model: { ... },
  // Emergency context hardcoded
});

// Then use it once and never again
vapi.start(assistant.id);
```

**Problems:**
- Creates 1000s of assistants in dashboard
- No way to pass dynamic context
- Clutters VAPI account
- Can't embed real-time emergency data

### ✅ **With Transient (Correct Way)**
```typescript
// Use ONE base assistant from dashboard
// Inject dynamic context per call
vapi.start("base_assistant_id", {
  variableValues: {
    incidentId: "cm5abc123",  // Dynamic per emergency
    emergencyType: "fire",
    confidence: "92"
  },
  model: {
    messages: [{
      role: "system",
      content: `Emergency: ${emergency.type}...`  // Real-time data
    }]
  }
});
```

**Benefits:**
- ✅ One assistant handles all emergencies
- ✅ Real-time context injection
- ✅ No dashboard clutter
- ✅ Perfect for dynamic scenarios

## 📋 Setup Checklist

### Backend (.env)
```bash
VAPI_PRIVATE_API_KEY=sk_live_xxxxx  # For server ops (optional)
```

### Frontend (.env)
```bash
NEXT_PUBLIC_VAPI_PUBLIC_KEY=pk_live_xxxxx
NEXT_PUBLIC_VAPI_ASSISTANT_ID=asst_xxxxx
```

### VAPI Dashboard
1. **Create ONE base assistant**
   - Name: "Emergency Info Collector"
   - Model: gpt-4o
   - Voice: 11labs Rachel
   - Transcriber: Deepgram nova-2

2. **Add submitReport tool:**
```json
{
  "type": "function",
  "function": {
    "name": "submitReport",
    "description": "Submit collected emergency info",
    "parameters": {
      "type": "object",
      "properties": {
        "locationConfirmed": { "type": "string" },
        "peopleAffected": { "type": "number" },
        "currentStatus": { "type": "string" },
        "immediateHazards": { 
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["locationConfirmed", "peopleAffected", "currentStatus"]
    }
  }
}
```

3. **Set Server URL:**
```
https://fearless-guineapig-482.convex.site/vapi-webhook
```

### HTML (Add to layout)
```html
<script src="https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.5.0/dist/index.umd.js"></script>
```

## 🧪 Test Flow

1. Start: `bun run dev`
2. Go to: `http://localhost:3000/stream`
3. Show fire to camera
4. Wait for VAPI call to start
5. Speak to AI: "Yes I'm safe, it's a small kitchen fire at 123 Main St"
6. AI calls submitReport tool
7. Check Convex logs: `bunx convex logs`
8. Verify incident updated with VAPI data + Grok synthesis

## 🔧 Webhook Extracts incidentId From:
```typescript
const incidentId = 
  message.call?.assistantOverrides?.variableValues?.incidentId ||
  message.call?.assistant?.metadata?.incidentId;
```

First tries `variableValues` (transient), falls back to `metadata` (permanent).

---

**TL;DR:** Transient = dynamic context per call. Perfect for emergencies where every call needs different real-time data embedded in the assistant's system prompt.
