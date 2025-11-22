"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, PerspectiveCamera } from "@react-three/drei";
import { MapPin, Clock, Circle, Box } from "lucide-react";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

function Model({ url }: { url: string }) {
	const { scene } = useGLTF(url);
	const groupRef = useRef<THREE.Group>(null);

	useEffect(() => {
		if (!scene) return;

		scene.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				// Create point cloud from mesh geometry
				const geometry = child.geometry;
				const positions = geometry.attributes.position;
				
				// Sample points from the mesh
				const pointsGeometry = new THREE.BufferGeometry();
				const points: number[] = [];
				
				// Sample every vertex
				for (let i = 0; i < positions.count; i++) {
					points.push(
						positions.getX(i),
						positions.getY(i),
						positions.getZ(i)
					);
				}
				
				pointsGeometry.setAttribute(
					'position',
					new THREE.Float32BufferAttribute(points, 3)
				);

				// Create point material with cyan/blue color
				const pointsMaterial = new THREE.PointsMaterial({
					color: 0x00ffff,
					size: 0.03,
					sizeAttenuation: true,
					transparent: true,
					opacity: 0.8,
				});

				const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
				pointCloud.position.copy(child.position);
				pointCloud.rotation.copy(child.rotation);
				pointCloud.scale.copy(child.scale);

				// Replace mesh with point cloud
				if (child.parent) {
					child.parent.add(pointCloud);
					child.visible = false;
				}
			}
		});
	}, [scene]);

	return <primitive ref={groupRef} object={scene} scale={1.5} />;
}

export function ModelViewerCard() {
	return (
		<div className="rounded-lg overflow-hidden border border-border">
			{/* 3D Viewer */}
			<div className="relative aspect-video bg-linear-to-br from-gray-900 via-blue-900/20 to-gray-900">
				<Canvas>
					<Suspense fallback={null}>
						<PerspectiveCamera makeDefault position={[0, 1, 5]} />
						<ambientLight intensity={0.8} />
						<pointLight position={[10, 10, 10]} intensity={1.5} color="#00ffff" />
						<pointLight position={[-10, -10, -10]} intensity={0.5} color="#0088ff" />
						<Model url="/8_11_2025.glb" />
						<OrbitControls 
							enableZoom={true}
							enablePan={true}
							minDistance={2}
							maxDistance={10}
						/>
						<gridHelper args={[10, 10, 0x00ffff, 0x004488]} />
					</Suspense>
				</Canvas>

				{/* Status Indicator */}
				<div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
					<Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
					<span className="text-xs font-medium text-blue-400">3D MODEL</span>
				</div>

				{/* Model indicator */}
				<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
					<Box className="w-3 h-3 text-white" />
					<span className="text-xs text-white">LIVE</span>
				</div>
			</div>

			{/* Feed Info */}
			<div className="bg-card p-3 space-y-2">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<p className="text-sm font-semibold">🏗️ 3D Scene Model</p>
						<p className="text-xs text-muted-foreground">Reconstructed Environment</p>
					</div>
				</div>

				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<MapPin className="w-3 h-3" />
					<span>Y Combinator, 335 Pioneer Way, Mountain View, CA 94041</span>
				</div>

				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Clock className="w-3 h-3" />
					<span>Real-time 3D reconstruction</span>
				</div>
			</div>
		</div>
	);
}
