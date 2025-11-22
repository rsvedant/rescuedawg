import { internalMutation } from "./_generated/server";

export const seedDemoIncidents = internalMutation({
	handler: async (ctx) => {
		const now = Date.now();

		const incidents = [
			// SCENARIO 1: Elderly Fall - High Priority EMS
			{
				incidentNumber: "2025-001428",
				callReceived: now - 8 * 60 * 1000, // 8 minutes ago
				dispatchTime: now - 7 * 60 * 1000,
				incidentType: "medical",
				severity: 4,
				priority: "HIGH",
				location: {
					address: "742 Evergreen Terrace",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0462, lon: -123.0236 },
					locationNotes: "Second floor apartment, no elevator",
				},
				caller: {
					phoneNumber: "(555) 123-4567",
					name: "Sarah Johnson",
					relationship: "daughter",
				},
				description:
					"83-year-old male fell in bathroom, suspected hip fracture, conscious but in severe pain",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: My father fell in the bathroom! He can't get up!\nDISPATCHER: Okay, I'm sending help right now. Is he conscious?\nCALLER: Yes, but he's in a lot of pain. He thinks he broke his hip.\nDISPATCHER: Don't try to move him. Paramedics are on their way. Stay with him and keep him still.`,
				victims: [
					{
						age: 83,
						gender: "male",
						condition: "conscious",
						injuries: ["suspected hip fracture", "minor head laceration"],
						medicalHistory: ["hypertension", "diabetes type 2"],
					},
				],
				assignedUnits: [
					{
						unitId: "MEDIC-14",
						department: "EMS",
						status: "en-route",
						personnelCount: 2,
						eta: now + 3 * 60 * 1000,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 2: Structure Fire - Multi-Agency Critical
			{
				incidentNumber: "2025-001429",
				callReceived: now - 15 * 60 * 1000,
				dispatchTime: now - 14 * 60 * 1000,
				arrivalTime: now - 10 * 60 * 1000,
				incidentType: "fire",
				severity: 5,
				priority: "CRITICAL",
				location: {
					address: "1247 Industrial Way",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0521, lon: -123.0875 },
					locationNotes: "Commercial warehouse, adjacent structures at risk",
				},
				caller: {
					phoneNumber: "(555) 987-6543",
					name: "Mike Torres",
					relationship: "witness",
				},
				description:
					"Commercial warehouse fire with heavy smoke, possible trapped occupants, spreading to adjacent building",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: There's a huge fire at the warehouse on Industrial Way! The whole building is going up!\nDISPATCHER: Is anyone inside the building?\nCALLER: I don't know, but there are cars in the parking lot! The fire is spreading fast!\nDISPATCHER: Multiple units are responding. Stay back from the building.`,
				victims: [
					{
						age: 42,
						gender: "male",
						condition: "critical",
						injuries: ["severe smoke inhalation", "second-degree burns"],
					},
				],
				assignedUnits: [
					{
						unitId: "ENGINE-7",
						department: "Fire",
						status: "on-scene",
						personnelCount: 4,
					},
					{
						unitId: "ENGINE-12",
						department: "Fire",
						status: "on-scene",
						personnelCount: 4,
					},
					{
						unitId: "LADDER-3",
						department: "Fire",
						status: "en-route",
						personnelCount: 3,
						eta: now + 2 * 60 * 1000,
					},
					{
						unitId: "MEDIC-7",
						department: "EMS",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "POLICE-23",
						department: "Police",
						status: "on-scene",
						personnelCount: 2,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 3: Assault - Police + EMS
			{
				incidentNumber: "2025-001430",
				callReceived: now - 22 * 60 * 1000,
				dispatchTime: now - 21 * 60 * 1000,
				arrivalTime: now - 17 * 60 * 1000,
				closedTime: now - 5 * 60 * 1000,
				incidentType: "police",
				severity: 3,
				priority: "HIGH",
				location: {
					address: "456 Oak Street",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0489, lon: -123.0412 },
				},
				caller: {
					phoneNumber: "(555) 234-5678",
					relationship: "witness",
				},
				description:
					"Physical altercation outside bar, one victim with facial injuries, suspect fled on foot",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: There's a fight outside Murphy's Bar! One guy is bleeding really bad!\nDISPATCHER: Are weapons involved?\nCALLER: I don't think so, just fists. The attacker ran that way!`,
				victims: [
					{
						age: 28,
						gender: "male",
						condition: "stable",
						injuries: ["facial lacerations", "possible broken nose"],
					},
				],
				assignedUnits: [
					{
						unitId: "POLICE-18",
						department: "Police",
						status: "available",
						personnelCount: 2,
					},
					{
						unitId: "MEDIC-9",
						department: "EMS",
						status: "available",
						personnelCount: 2,
					},
				],
				status: "closed",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 4: Multi-Vehicle Collision - Mass Casualty
			{
				incidentNumber: "2025-001431",
				callReceived: now - 5 * 60 * 1000,
				dispatchTime: now - 4 * 60 * 1000,
				incidentType: "multi-agency",
				severity: 5,
				priority: "CRITICAL",
				location: {
					address: "I-5 Northbound Mile Marker 187",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0612, lon: -123.0289 },
					locationNotes:
						"Highway blocked both lanes, 5 vehicles involved, traffic backing up",
				},
				caller: {
					phoneNumber: "(555) 876-5432",
					relationship: "witness",
				},
				description:
					"5-vehicle collision on I-5, multiple casualties including children, highway completely blocked",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: There's a massive accident on I-5! Multiple cars, people are injured!\nDISPATCHER: How many vehicles are involved?\nCALLER: At least five! I can see people trapped! One car is smoking!`,
				victims: [
					{
						age: 35,
						gender: "female",
						condition: "critical",
						injuries: ["chest trauma", "head injury", "possible internal bleeding"],
					},
					{
						age: 8,
						gender: "female",
						condition: "stable",
						injuries: ["minor lacerations", "possible whiplash"],
					},
					{
						age: 52,
						gender: "male",
						condition: "conscious",
						injuries: ["leg fracture", "internal bleeding suspected"],
					},
				],
				assignedUnits: [
					{
						unitId: "MEDIC-12",
						department: "EMS",
						status: "dispatched",
						personnelCount: 2,
						eta: now + 6 * 60 * 1000,
					},
					{
						unitId: "MEDIC-15",
						department: "EMS",
						status: "dispatched",
						personnelCount: 2,
						eta: now + 7 * 60 * 1000,
					},
					{
						unitId: "ENGINE-5",
						department: "Fire",
						status: "dispatched",
						personnelCount: 4,
						eta: now + 5 * 60 * 1000,
					},
					{
						unitId: "POLICE-45",
						department: "Police",
						status: "dispatched",
						personnelCount: 2,
						eta: now + 4 * 60 * 1000,
					},
				],
				status: "dispatched",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 5: Cardiac Arrest - Time Critical
			{
				incidentNumber: "2025-001432",
				callReceived: now - 2 * 60 * 1000,
				dispatchTime: now - 90 * 1000,
				incidentType: "medical",
				severity: 5,
				priority: "CRITICAL",
				location: {
					address: "892 Maple Drive",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0445, lon: -123.0567 },
				},
				caller: {
					phoneNumber: "(555) 345-6789",
					name: "Robert Chen",
					relationship: "spouse",
				},
				description:
					"67-year-old male, cardiac arrest, CPR in progress by spouse, history of heart disease",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: My husband collapsed! He's not breathing!\nDISPATCHER: I'm sending paramedics immediately. Start CPR right now. Push hard and fast in the center of his chest.\nCALLER: Okay, okay! I'm doing it!\nDISPATCHER: Keep going, don't stop. Help is almost there.`,
				victims: [
					{
						age: 67,
						gender: "male",
						condition: "critical",
						injuries: ["cardiac arrest"],
						medicalHistory: [
							"coronary artery disease",
							"high cholesterol",
							"previous MI",
						],
					},
				],
				assignedUnits: [
					{
						unitId: "MEDIC-3",
						department: "EMS",
						status: "en-route",
						personnelCount: 2,
						eta: now + 90 * 1000,
					},
					{
						unitId: "ENGINE-2",
						department: "Fire",
						status: "en-route",
						personnelCount: 4,
						eta: now + 60 * 1000,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 6: Apartment Fire with Evacuations
			{
				incidentNumber: "2025-001433",
				callReceived: now - 18 * 60 * 1000,
				dispatchTime: now - 17 * 60 * 1000,
				arrivalTime: now - 12 * 60 * 1000,
				incidentType: "fire",
				severity: 4,
				priority: "HIGH",
				location: {
					address: "335 Pine Street Apartments",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0501, lon: -123.0621 },
					locationNotes: "4-story building, fire on 3rd floor, 48 units total",
				},
				caller: {
					phoneNumber: "(555) 445-6677",
					name: "Jennifer Martinez",
					relationship: "resident",
				},
				description:
					"Apartment fire on 3rd floor, smoke throughout building, residents evacuating, possible elderly trapped",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: Fire! There's fire in my building! Third floor!\nDISPATCHER: Get out of the building now. Are you able to evacuate?\nCALLER: Yes, but there's an elderly couple on the third floor who might need help!`,
				victims: [],
				assignedUnits: [
					{
						unitId: "ENGINE-4",
						department: "Fire",
						status: "on-scene",
						personnelCount: 4,
					},
					{
						unitId: "LADDER-1",
						department: "Fire",
						status: "on-scene",
						personnelCount: 3,
					},
					{
						unitId: "MEDIC-11",
						department: "EMS",
						status: "on-scene",
						personnelCount: 2,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 7: Armed Robbery in Progress
			{
				incidentNumber: "2025-001434",
				callReceived: now - 12 * 60 * 1000,
				dispatchTime: now - 11 * 60 * 1000,
				arrivalTime: now - 8 * 60 * 1000,
				incidentType: "police",
				severity: 5,
				priority: "CRITICAL",
				location: {
					address: "24-Hour Convenience Store, 789 Main Street",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0478, lon: -123.0589 },
				},
				caller: {
					phoneNumber: "(555) 992-8844",
					name: "Silent alarm / Store clerk",
					relationship: "victim",
				},
				description:
					"Armed robbery in progress, two suspects with firearms, clerk activated silent alarm, customers inside",
				transcription: `DISPATCHER: 911, silent alarm activated at 789 Main Street.\nOFFICER: Copy, responding. Multiple units requested.\nDISPATCHER: Witnesses report two armed suspects, approximately 5 customers inside.`,
				victims: [
					{
						age: 26,
						gender: "male",
						condition: "stable",
						injuries: ["minor assault", "psychological trauma"],
					},
				],
				assignedUnits: [
					{
						unitId: "POLICE-12",
						department: "Police",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "POLICE-15",
						department: "Police",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "POLICE-19",
						department: "Police",
						status: "en-route",
						personnelCount: 2,
						eta: now + 3 * 60 * 1000,
					},
					{
						unitId: "MEDIC-8",
						department: "EMS",
						status: "staging",
						personnelCount: 2,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 8: Industrial Chemical Spill
			{
				incidentNumber: "2025-001435",
				callReceived: now - 25 * 60 * 1000,
				dispatchTime: now - 24 * 60 * 1000,
				arrivalTime: now - 19 * 60 * 1000,
				incidentType: "hazmat",
				severity: 4,
				priority: "HIGH",
				location: {
					address: "Springfield Industrial Park, Building 7",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0556, lon: -123.0901 },
					locationNotes: "Chemical storage facility, outdoor spill area",
				},
				caller: {
					phoneNumber: "(555) 334-5566",
					name: "David Park",
					relationship: "facility manager",
				},
				description:
					"Chemical spill of unknown substance, 3 workers exposed, evacuation of adjacent buildings initiated",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: We have a chemical spill! Three workers were exposed!\nDISPATCHER: What chemical?\nCALLER: I'm not sure yet, checking the manifest. They're coughing and having trouble breathing.`,
				victims: [
					{
						age: 34,
						gender: "male",
						condition: "stable",
						injuries: ["chemical exposure", "respiratory irritation"],
					},
					{
						age: 41,
						gender: "female",
						condition: "stable",
						injuries: ["chemical exposure", "skin irritation"],
					},
					{
						age: 29,
						gender: "male",
						condition: "conscious",
						injuries: ["chemical exposure", "eye irritation"],
					},
				],
				assignedUnits: [
					{
						unitId: "HAZMAT-1",
						department: "Fire",
						status: "on-scene",
						personnelCount: 6,
					},
					{
						unitId: "ENGINE-9",
						department: "Fire",
						status: "on-scene",
						personnelCount: 4,
					},
					{
						unitId: "MEDIC-13",
						department: "EMS",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "POLICE-31",
						department: "Police",
						status: "on-scene",
						personnelCount: 2,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 9: Stroke - Neurological Emergency
			{
				incidentNumber: "2025-001436",
				callReceived: now - 6 * 60 * 1000,
				dispatchTime: now - 5 * 60 * 1000,
				incidentType: "medical",
				severity: 5,
				priority: "CRITICAL",
				location: {
					address: "1523 Willow Lane",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0423, lon: -123.0502 },
				},
				caller: {
					phoneNumber: "(555) 778-8899",
					name: "Patricia Wilson",
					relationship: "spouse",
				},
				description:
					"72-year-old female, sudden facial drooping, slurred speech, right-side weakness - stroke suspected",
				transcription: `DISPATCHER: 911, what's your emergency?\nCALLER: Something's wrong with my wife! Her face is drooping and she can't talk right!\nDISPATCHER: When did this start?\nCALLER: Just a few minutes ago! She was fine and then suddenly...\nDISPATCHER: This sounds like a stroke. Paramedics are on the way. What time exactly did symptoms start?`,
				victims: [
					{
						age: 72,
						gender: "female",
						condition: "critical",
						injuries: ["suspected stroke", "right-side weakness"],
						medicalHistory: ["hypertension", "atrial fibrillation"],
					},
				],
				assignedUnits: [
					{
						unitId: "MEDIC-6",
						department: "EMS",
						status: "en-route",
						personnelCount: 2,
						eta: now + 4 * 60 * 1000,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},

			// SCENARIO 10: Multi-Victim Stabbing
			{
				incidentNumber: "2025-001437",
				callReceived: now - 10 * 60 * 1000,
				dispatchTime: now - 9 * 60 * 1000,
				arrivalTime: now - 6 * 60 * 1000,
				incidentType: "multi-agency",
				severity: 5,
				priority: "CRITICAL",
				location: {
					address: "Springfield Community Center, 901 Park Avenue",
					city: "Springfield",
					state: "OR",
					zipCode: "97477",
					coordinates: { lat: 44.0512, lon: -123.0434 },
					locationNotes: "Public event in progress, multiple victims",
				},
				caller: {
					phoneNumber: "(555) 123-9999",
					name: "Multiple callers",
					relationship: "witness",
				},
				description:
					"Multiple stabbing victims at community event, suspect in custody, 4 victims with varying injuries",
				transcription: `DISPATCHER: 911, multiple callers reporting stabbing at community center!\nCALLER 1: There's a man with a knife! People are hurt!\nDISPATCHER: Officers and paramedics responding. How many injured?\nCALLER 2: I see at least four people bleeding! Hurry!`,
				victims: [
					{
						age: 28,
						gender: "male",
						condition: "critical",
						injuries: ["multiple stab wounds", "severe blood loss"],
					},
					{
						age: 45,
						gender: "female",
						condition: "stable",
						injuries: ["single stab wound to arm"],
					},
					{
						age: 19,
						gender: "male",
						condition: "conscious",
						injuries: ["defensive wounds to hands"],
					},
					{
						age: 52,
						gender: "male",
						condition: "stable",
						injuries: ["stab wound to abdomen"],
					},
				],
				assignedUnits: [
					{
						unitId: "POLICE-8",
						department: "Police",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "POLICE-14",
						department: "Police",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "MEDIC-4",
						department: "EMS",
						status: "on-scene",
						personnelCount: 2,
					},
					{
						unitId: "MEDIC-5",
						department: "EMS",
						status: "en-route",
						personnelCount: 2,
						eta: now + 2 * 60 * 1000,
					},
					{
						unitId: "MEDIC-16",
						department: "EMS",
						status: "en-route",
						personnelCount: 2,
						eta: now + 3 * 60 * 1000,
					},
				],
				status: "active",
				version: 1,
				createdBy: "system",
			},
		];

		// Insert all mock incidents
		for (const incident of incidents) {
			await ctx.db.insert("incidents", incident);
		}

		return { count: incidents.length, message: "Demo incidents seeded successfully" };
	},
});
