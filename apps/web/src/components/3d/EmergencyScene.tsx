"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
	OrbitControls,
	Environment,
	PerspectiveCamera,
	Points,
	PointMaterial,
	useGLTF,
} from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

interface EmergencySceneProps {
	pointCloudData?: Float32Array;
	victimPosition?: [number, number, number];
	sceneType?: "indoor" | "outdoor" | "street";
}

export function EmergencyScene({
	pointCloudData,
	victimPosition = [0, 0.5, 0],
	sceneType = "indoor",
}: EmergencySceneProps) {
	return (
		<div className="w-full h-[600px] rounded-lg overflow-hidden bg-black">
			<Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
				<PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />

				{/* Lighting */}
				<ambientLight intensity={0.3} />
				<spotLight
					position={[10, 20, 10]}
					angle={0.3}
					penumbra={1}
					intensity={2}
					castShadow
					shadow-mapSize={[2048, 2048]}
				/>
				<directionalLight position={[-10, 10, -5]} intensity={1} castShadow />

				{/* HDR Environment */}
				<Environment
					preset={sceneType === "outdoor" ? "sunset" : "city"}
					background
					backgroundBlurriness={0.5}
				/>

				{/* Scene Content */}
				<LiDARPointCloud data={pointCloudData} />
				<VictimFigure position={victimPosition} />
				<GroundPlane />

				{/* Camera Controls */}
				<OrbitControls
					makeDefault
					minDistance={5}
					maxDistance={50}
					enableDamping
					dampingFactor={0.05}
				/>
			</Canvas>
		</div>
	);
}

// LiDAR Point Cloud Component - Loads actual GLB file
function LiDARPointCloud({ data }: { data?: Float32Array }) {
	const { scene } = useGLTF('/8_11_2025.glb');
	const groupRef = useRef<THREE.Group>(null);

	useFrame((state) => {
		if (groupRef.current) {
			// Subtle rotation for dramatic effect
			groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
		}
	});

	return (
		<primitive 
			ref={groupRef}
			object={scene.clone()} 
			scale={[1, 1, 1]}
			position={[0, 0, 0]}
		/>
	);
}

// Preload the GLB file
useGLTF.preload('/8_11_2025.glb');

// Humanoid Victim Figure
function VictimFigure({ position }: { position: [number, number, number] }) {
	return (
		<group position={position}>
			{/* Head */}
			<mesh position={[0, 1.6, 0]} castShadow>
				<sphereGeometry args={[0.15, 32, 32]} />
				<meshStandardMaterial color="#ffdbac" roughness={0.6} />
			</mesh>

			{/* Body */}
			<mesh position={[0, 1, 0]} castShadow>
				<cylinderGeometry args={[0.2, 0.25, 0.8, 32]} />
				<meshStandardMaterial color="#3b82f6" roughness={0.7} />
			</mesh>

			{/* Arms */}
			<mesh position={[-0.35, 1, 0]} rotation={[0, 0, 0.3]} castShadow>
				<cylinderGeometry args={[0.06, 0.06, 0.7, 16]} />
				<meshStandardMaterial color="#3b82f6" />
			</mesh>
			<mesh position={[0.35, 1, 0]} rotation={[0, 0, -0.3]} castShadow>
				<cylinderGeometry args={[0.06, 0.06, 0.7, 16]} />
				<meshStandardMaterial color="#3b82f6" />
			</mesh>

			{/* Legs */}
			<mesh position={[-0.15, 0.25, 0]} castShadow>
				<cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
				<meshStandardMaterial color="#1e40af" />
			</mesh>
			<mesh position={[0.15, 0.25, 0]} castShadow>
				<cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
				<meshStandardMaterial color="#1e40af" />
			</mesh>

			{/* Emergency Indicator - Pulsing Red Light */}
			<mesh position={[0, 2, 0]}>
				<sphereGeometry args={[0.1, 16, 16]} />
				<meshBasicMaterial color="#ef4444" />
				<pointLight color="#ef4444" intensity={2} distance={3} />
			</mesh>

			{/* Animated Pulse Effect */}
			<PulsingIndicator position={[0, 2, 0]} />
		</group>
	);
}

// Pulsing Emergency Indicator
function PulsingIndicator({ position }: { position: [number, number, number] }) {
	const ref = useRef<THREE.Mesh>(null);

	useFrame((state) => {
		if (ref.current) {
			// Pulsing scale effect
			const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
			ref.current.scale.setScalar(pulse);
		}
	});

	return (
		<mesh ref={ref} position={position}>
			<sphereGeometry args={[0.15, 16, 16]} />
			<meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
		</mesh>
	);
}

// Ground Plane
function GroundPlane() {
	return (
		<mesh
			rotation={[-Math.PI / 2, 0, 0]}
			position={[0, -0.01, 0]}
			receiveShadow
		>
			<planeGeometry args={[30, 30]} />
			<meshStandardMaterial color="#2c3e50" roughness={0.8} metalness={0.2} />
		</mesh>
	);
}

