import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	todos: defineTable({
		text: v.string(),
		completed: v.boolean(),
	}),

	// Emergency Incidents
	incidents: defineTable({
		// Core Incident Data
		incidentNumber: v.string(), // e.g., "2025-000123"
		callReceived: v.number(), // timestamp
		dispatchTime: v.optional(v.number()),
		arrivalTime: v.optional(v.number()),
		closedTime: v.optional(v.number()),

		// Emergency Classification
		incidentType: v.string(), // "medical", "fire", "police", "hazmat", "multi-agency"
		severity: v.number(), // 1-5 scale
		priority: v.string(), // "CRITICAL", "HIGH", "MEDIUM", "LOW"

		// Location Data
		location: v.object({
			address: v.string(),
			city: v.string(),
			state: v.string(),
			zipCode: v.string(),
			coordinates: v.object({
				lat: v.number(),
				lon: v.number(),
			}),
			locationNotes: v.optional(v.string()),
		}),

		// Caller Information
		caller: v.object({
			phoneNumber: v.string(),
			name: v.optional(v.string()),
			relationship: v.optional(v.string()), // "victim", "witness", "bystander"
			languageBarrier: v.optional(v.boolean()),
		}),

		// Incident Details
		description: v.string(),
		transcription: v.optional(v.string()), // Full 911 call transcription
		aiAnalysis: v.optional(v.string()),

		// Victim/Patient Information
		victims: v.array(
			v.object({
				age: v.optional(v.number()),
				gender: v.optional(v.string()),
				condition: v.string(), // "conscious", "unconscious", "critical", "stable"
				injuries: v.array(v.string()),
				medicalHistory: v.optional(v.array(v.string())),
			}),
		),

		// Response Units
		assignedUnits: v.array(
			v.object({
				unitId: v.string(),
				department: v.string(), // "EMS", "Fire", "Police"
				status: v.string(), // "dispatched", "en-route", "on-scene", "available"
				personnelCount: v.number(),
				eta: v.optional(v.number()),
			}),
		),

		// Status Tracking
		status: v.string(), // "received", "dispatched", "active", "resolved", "closed"
		version: v.number(), // For optimistic locking

		// Metadata
		createdBy: v.string(),
		lastUpdatedBy: v.optional(v.string()),
		lastUpdatedAt: v.optional(v.number()),

		// LiDAR/Computer Vision
		lidarDataUrl: v.optional(v.string()),
		scenePhotos: v.optional(v.array(v.id("_storage"))),
		cvAnalysisComplete: v.optional(v.boolean()),

		// VAPI Call Data (bystander interview)
		vapiCallId: v.optional(v.string()),
		vapiTranscript: v.optional(v.string()),
		vapiCollectedData: v.optional(
			v.object({
				locationConfirmed: v.string(),
				peopleAffected: v.number(),
				currentStatus: v.string(),
				immediateHazards: v.array(v.string()),
				additionalInfo: v.optional(v.string()),
			}),
		),
		vapiCallStatus: v.optional(v.string()), // "pending", "completed", "failed"

		// Dog View (Body Camera) Integration
		dogViewFeedId: v.optional(v.string()), // Links to videoFeeds.feedId
		dogViewRoomName: v.optional(v.string()), // LiveKit room name
		dogViewStartTime: v.optional(v.number()), // When feed started for incident

		// SAMPLE Assessment (Medical Protocol)
		callTranscript: v.optional(v.string()), // Full call transcript
		callDuration: v.optional(v.number()), // Call duration in seconds
		callEndedAt: v.optional(v.number()), // Timestamp when call ended
		sampleAssessmentId: v.optional(v.id("sampleAssessments")), // Link to SAMPLE assessment
		sampleAssessmentCompleted: v.optional(v.boolean()), // Whether SAMPLE was completed
	})
		.index("by_status", ["status"])
		.index("by_time", ["callReceived"])
		.index("by_type", ["incidentType"])
		.index("by_severity", ["severity"])
		.searchIndex("search_description", {
			searchField: "description",
			filterFields: ["incidentType", "status"],
		}),

	// SAMPLE Medical Assessments
	sampleAssessments: defineTable({
		incidentId: v.id("incidents"),
		patientStatus: v.union(
			v.literal("conscious"),
			v.literal("unconscious"),
			v.literal("partially_responsive")
		),

		// S - Signs & Symptoms
		signsSymptoms: v.object({
			patientReported: v.string(),
			observedSigns: v.array(v.string()),
		}),

		// A - Allergies
		allergies: v.object({
			known: v.array(v.string()),
			unknown: v.boolean(),
		}),

		// M - Medications
		medications: v.object({
			current: v.array(
				v.object({
					name: v.string(),
					lastTaken: v.optional(v.string()),
				})
			),
			unknown: v.boolean(),
		}),

		// P - Pre-existing conditions
		preExistingConditions: v.object({
			conditions: v.array(v.string()),
			unknown: v.boolean(),
		}),

		// L - Last oral intake
		lastOralIntake: v.object({
			food: v.optional(v.string()),
			time: v.optional(v.string()),
			unknown: v.boolean(),
		}),

		// E - Events leading up
		eventsLeadingUp: v.object({
			description: v.string(),
			activity: v.optional(v.string()),
			previousOccurrence: v.boolean(),
		}),

		// Optional focused checks
		focusedChecks: v.optional(
			v.object({
				fastScreen: v.optional(
					v.object({
						faceSymmetry: v.string(),
						armStrength: v.string(),
						speechClarity: v.string(),
					})
				),
				bloodSugarClue: v.optional(v.string()),
				heatExertionClue: v.optional(v.string()),
			})
		),

		// Full transcript
		transcript: v.string(),

		// Assessment summary
		summary: v.string(),

		// Timestamps
		assessmentStarted: v.number(),
		assessmentCompleted: v.number(),
		createdAt: v.number(),
	}).index("by_incident", ["incidentId"]),

	// Department Communication
	departmentMessages: defineTable({
		incidentId: v.id("incidents"),
		message: v.string(),
		department: v.string(), // "EMS", "Fire", "Police"
		sender: v.string(), // email or user ID
		senderName: v.string(),
		timestamp: v.number(),
	}).index("by_incident", ["incidentId", "timestamp"]),

	// Presence Tracking (who's viewing incidents)
	presence: defineTable({
		incidentId: v.id("incidents"),
		userId: v.string(),
		userName: v.string(),
		department: v.optional(v.string()),
		status: v.union(v.literal("viewing"), v.literal("away")),
		lastSeen: v.number(),
	})
		.index("by_incident", ["incidentId"])
		.index("by_user_incident", ["userId", "incidentId"]),

	// Incident Files (photos, LiDAR data)
	incidentFiles: defineTable({
		storageId: v.id("_storage"),
		incidentId: v.id("incidents"),
		fileName: v.string(),
		fileType: v.string(), // MIME type
		fileSize: v.number(), // bytes
		uploadedBy: v.string(),
		uploadedAt: v.number(),
	}).index("by_incident", ["incidentId"]),

	// Computer Vision Analysis
	cvAnalysis: defineTable({
		incidentId: v.id("incidents"),
		analysisType: v.string(), // "person-detection", "scene-analysis", "lidar-processing"
		results: v.any(), // Flexible structure for CV results
		confidence: v.number(), // 0-1
		processingTime: v.number(), // milliseconds
		receivedAt: v.number(),
	}).index("by_incident", ["incidentId"]),

	// Scene Data (environment, hazards)
	sceneData: defineTable({
		incidentId: v.id("incidents"),
		environment: v.string(), // "indoor", "outdoor", "street"
		hazards: v.array(v.string()), // ["fire", "smoke", "debris"]
		accessibility: v.optional(v.string()), // entrance points, obstacles
		timestamp: v.number(),
	}).index("by_incident", ["incidentId"]),

	// CV Processing Jobs
	cvJobs: defineTable({
		jobId: v.string(),
		incidentId: v.id("incidents"),
		videoUrl: v.optional(v.string()),
		status: v.string(), // "processing", "completed", "failed"
		startedAt: v.number(),
		completedAt: v.optional(v.number()),
	})
		.index("by_incident", ["incidentId"])
		.index("by_status", ["status"]),

	// Incident History (audit trail)
	incidentHistory: defineTable({
		incidentId: v.id("incidents"),
		changes: v.any(), // Object with changed fields
		updatedBy: v.string(),
		timestamp: v.number(),
	}).index("by_incident", ["incidentId", "timestamp"]),

	// Device Registration
	devices: defineTable({
		deviceId: v.string(),
		name: v.string(),
		type: v.string(), // "rescue_dawg", "mobile_app", etc.
		lastSeen: v.number(),
		location: v.optional(
			v.object({
				latitude: v.number(),
				longitude: v.number(),
			}),
		),
		status: v.union(v.literal("active"), v.literal("inactive")),
		capabilities: v.object({
			hasCamera: v.boolean(),
			hasLidar: v.boolean(),
			hasAudio: v.boolean(),
			hasGPS: v.boolean(),
		}),
	}).index("by_deviceId", ["deviceId"]),

	// Video Feeds (LiveKit streams)
	videoFeeds: defineTable({
		feedId: v.string(), // LiveKit room/track ID
		deviceId: v.string(), // Laptop device ID
		name: v.string(), // "Unit 5 - Downtown Patrol"
		location: v.object({
			address: v.string(),
			coordinates: v.object({
				lat: v.number(),
				lon: v.number(),
			}),
		}),
		status: v.string(), // "monitoring", "alert", "inactive"
		lastFrameAnalyzedAt: v.optional(v.number()),
		isAnalyzing: v.boolean(), // Is AI analysis active?
		analysisMode: v.string(), // "idle", "monitoring", "alert"
		createdAt: v.number(),
		lastSeenAt: v.number(),
	})
		.index("by_status", ["status"])
		.index("by_device", ["deviceId"])
		.index("by_feedId", ["feedId"]),

	// Video Analysis Alerts
	videoAlerts: defineTable({
		feedId: v.string(),
		frameTimestamp: v.number(),
		alertType: v.string(), // "fire", "fall", "fight", "accident", "hazard"
		confidence: v.number(), // 0-1
		description: v.string(), // AI-generated description
		frameUrl: v.optional(v.id("_storage")), // Snapshot
		incidentId: v.optional(v.id("incidents")), // Auto-created incident
		resolved: v.boolean(),
		createdAt: v.number(),
	})
		.index("by_feed", ["feedId", "createdAt"])
		.index("by_incident", ["incidentId"]),
});
