"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@rescuedawg/backend/convex/_generated/api";
import { Video, MapPin, Circle, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { LiveKitRoom, VideoTrack, useParticipants } from "@livekit/components-react";
import { Track, Participant } from "livekit-client";
import "@livekit/components-styles";

export function VideoFeedSidebar() {
	const [currentTime, setCurrentTime] = useState(new Date());
	const feeds = useQuery(api.videoFeeds.getActive);
	const generateToken = useAction(api.livekit.generateToken);
	const [token, setToken] = useState<string | null>(null);
	const [cctvFrame, setCctvFrame] = useState<string | null>(null);
	const [cctvConnected, setCctvConnected] = useState(false);
	const socketRef = useRef<any>(null);

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	// Socket.IO for CCTV feed
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Dynamically load Socket.IO
		const script = document.createElement('script');
		script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
		script.async = true;
		script.onload = () => {
			if ((window as any).io) {
				const io = (window as any).io;
				const socket = io('https://hachicctv.aadil.site', {
					transports: ['websocket', 'polling'],
					reconnection: true,
					reconnectionDelay: 1000,
					reconnectionAttempts: 5,
					extraHeaders: { 'ngrok-skip-browser-warning': 'true' }
				});
				socketRef.current = socket;

				socket.on('connect', () => {
					console.log('Dashboard CCTV connected');
					setCctvConnected(true);
					socket.emit('start_stream');
				});

				socket.on('video_frame', (data: { image: string }) => {
					setCctvFrame('data:image/jpeg;base64,' + data.image);
				});

				socket.on('disconnect', () => {
					console.log('Dashboard CCTV disconnected');
					setCctvConnected(false);
				});

				socket.on('connect_error', (error: any) => {
					console.error('Dashboard CCTV connection error:', error);
					setCctvConnected(false);
				});
			}
		};
		document.body.appendChild(script);

		return () => {
			if (socketRef.current) {
				socketRef.current.emit('stop_stream');
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			setCctvFrame(null);
			setCctvConnected(false);
		};
	}, []);

	useEffect(() => {
		async function getToken() {
			try {
				const jwt = await generateToken({
					identity: "dispatcher-" + Math.random().toString(36).slice(2),
					roomName: "emergency-feeds",
				});
				setToken(jwt);
			} catch (error) {
				console.error("Failed to get LiveKit token:", error);
			}
		}
		getToken();
	}, [generateToken]);

	if (!token) {
		return (
			<div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
				<div className="px-4 py-3 border-b border-gray-800">
					<h2 className="text-lg font-semibold text-white flex items-center gap-2">
						<Video className="w-5 h-5" />
						Live Feeds
					</h2>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<p className="text-gray-400 text-sm">Connecting...</p>
				</div>
			</div>
		);
	}

	const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
	if (!livekitUrl) {
		return (
			<div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
				<p className="text-red-400 text-sm">
					LiveKit URL not configured. Set NEXT_PUBLIC_LIVEKIT_URL in .env
				</p>
			</div>
		);
	}

	return (
		<div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
			<div className="px-4 py-3 border-b border-gray-800">
				<h2 className="text-lg font-semibold text-white flex items-center gap-2">
					<Video className="w-5 h-5" />
					Live Feeds
				</h2>
				<p className="text-xs text-gray-400 mt-1">
					{currentTime.toLocaleTimeString()}
				</p>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{/* CCTV Feed (Socket.IO) */}
				<CCTVFeedCard frame={cctvFrame} isConnected={cctvConnected} />

				{/* LiveKit Feeds (Dog View) */}
				<LiveKitRoom
					serverUrl={livekitUrl}
					token={token}
					connect={true}
					options={{ adaptiveStream: true, dynacast: true }}
				>
					{feeds && feeds.length > 0 ? (
						feeds.map((feed) => <FeedCard key={feed.feedId} feed={feed} />)
					) : (
						<div className="text-center py-8">
							<Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
							<p className="text-gray-400 text-sm">No active feeds</p>
						</div>
					)}
				</LiveKitRoom>
			</div>
		</div>
	);
}

function FeedCard({ feed }: { feed: any }) {
	const participants = useParticipants();

	// Find participant matching this feed
	const participant = participants.find(
		(p: Participant) => p.identity === feed.deviceId
	);

	// Get video track
	const videoTrackPublication = participant
		? Array.from(participant.videoTrackPublications.values())[0]
		: null;

	return (
		<div
			className={`rounded-lg overflow-hidden border-2 transition-colors ${
				feed.status === "alert"
					? "border-red-500 shadow-lg shadow-red-500/50"
					: "border-gray-700"
			}`}
		>
			{/* Video Feed */}
			<div className="relative aspect-video bg-gray-800">
				{videoTrackPublication && videoTrackPublication.isSubscribed ? (
					<VideoTrack
						trackRef={{
							participant: participant!,
							source: Track.Source.Camera,
							publication: videoTrackPublication,
						}}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
						<div className="text-center">
							<Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
							<p className="text-xs text-gray-500">Waiting for stream...</p>
						</div>
					</div>
				)}

				{/* Status Indicator */}
				<div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
					<Circle
						className={`w-2 h-2 ${
							feed.status === "alert"
								? "fill-red-500 text-red-500 animate-pulse"
								: videoTrackPublication?.isSubscribed
									? "fill-green-500 text-green-500"
									: "fill-gray-500 text-gray-500"
						}`}
					/>
					<span
						className={`text-xs font-medium ${
							feed.status === "alert"
								? "text-red-400"
								: videoTrackPublication?.isSubscribed
									? "text-green-400"
									: "text-gray-400"
						}`}
					>
						{feed.status === "alert" ? "ALERT" : videoTrackPublication?.isSubscribed ? "LIVE" : "OFFLINE"}
					</span>
				</div>

				{/* Recording indicator */}
				{videoTrackPublication?.isSubscribed && (
					<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
						<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						<span className="text-xs text-white">REC</span>
					</div>
				)}
			</div>

			{/* Feed Info */}
			<div className="bg-gray-800 p-3 space-y-2">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<p className="text-sm font-semibold text-white">{feed.feedId}</p>
						<p className="text-xs text-gray-400">{feed.name}</p>
					</div>
					{feed.status === "alert" && (
						<span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded">
							ALERT
						</span>
					)}
				</div>

				<div className="flex items-center gap-1 text-xs text-gray-400">
					<MapPin className="w-3 h-3" />
					<span>{feed.location.address}</span>
				</div>

				<div className="flex items-center gap-1 text-xs text-gray-500">
					<Clock className="w-3 h-3" />
					<span>
						{feed.lastFrameAnalyzedAt
							? `Analyzed ${new Date(feed.lastFrameAnalyzedAt).toLocaleTimeString()}`
							: "Analysis active"}
					</span>
				</div>
			</div>
		</div>
	);
}

function CCTVFeedCard({ frame, isConnected }: { frame: string | null; isConnected: boolean }) {
	return (
		<div className="rounded-lg overflow-hidden border-2 border-gray-700">
			{/* Video Feed */}
			<div className="relative aspect-video bg-gray-800">
				{frame ? (
					<img 
						src={frame} 
						alt="CCTV Feed" 
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
						<div className="text-center">
							<Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
							<p className="text-xs text-gray-500">
								{isConnected ? 'Waiting for stream...' : 'Connecting...'}
							</p>
						</div>
					</div>
				)}

				{/* Status Indicator */}
				<div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
					<Circle
						className={`w-2 h-2 ${
							isConnected && frame
								? "fill-green-500 text-green-500"
								: "fill-gray-500 text-gray-500"
						}`}
					/>
					<span
						className={`text-xs font-medium ${
							isConnected && frame
								? "text-green-400"
								: "text-gray-400"
						}`}
					>
						{isConnected && frame ? "LIVE" : "OFFLINE"}
					</span>
				</div>

				{/* Recording indicator */}
				{isConnected && frame && (
					<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
						<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						<span className="text-xs text-white">REC</span>
					</div>
				)}
			</div>

			{/* Feed Info */}
			<div className="bg-gray-800 p-3 space-y-2">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<p className="text-sm font-semibold text-white">📹 CCTV Feed</p>
						<p className="text-xs text-gray-400">External Camera</p>
					</div>
				</div>

				<div className="flex items-center gap-1 text-xs text-gray-400">
					<MapPin className="w-3 h-3" />
					<span>Y Combinator, 335 Pioneer Way, Mountain View, CA 94041</span>
				</div>

				<div className="flex items-center gap-1 text-xs text-gray-500">
					<Clock className="w-3 h-3" />
					<span>
						{isConnected ? 'Analysis active' : 'Offline'}
					</span>
				</div>
			</div>
		</div>
	);
}
