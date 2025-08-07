"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, RotateCcw } from "lucide-react";

interface TextVector {
	id: string;
	text: string;
	vector: number[];
	position: THREE.Vector3;
	color: string;
}

interface Similarity {
	id1: string;
	id2: string;
	text1: string;
	text2: string;
	score: number;
}

type DistanceMetric = "cosine" | "euclidean" | "manhattan" | "dot";

const SAMPLE_TEXTS = [
	"The cat sits on the mat",
	"A feline rests on the carpet",
	"Dogs love to play fetch",
	"Puppies enjoy running around",
	"Machine learning is fascinating",
	"AI algorithms process data",
	"The ocean waves crash",
	"Sea water sparkles blue",
];

export default function VectorVisualizer() {
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<THREE.Scene>();
	const rendererRef = useRef<THREE.WebGLRenderer>();
	const cameraRef = useRef<THREE.PerspectiveCamera>();
	const controlsRef = useRef<OrbitControls>();
	const pointsRef = useRef<Map<string, THREE.Mesh>>(new Map());
	const linesRef = useRef<THREE.Group>();
	const animationRef = useRef<number>();

	const [vectors, setVectors] = useState<TextVector[]>([]);
	const [selectedVector, setSelectedVector] = useState<string | null>(null);
	const [inputText, setInputText] = useState("");
	const [distanceMetric, setDistanceMetric] = useState<DistanceMetric>("cosine");
	const [similarities, setSimilarities] = useState<Similarity[]>([]);

	// Simulate text to vector conversion
	const textToVector = useCallback((text: string): number[] => {
		const words = text.toLowerCase().split(/\s+/);
		const vector = new Array(128).fill(0);

		// Simple hash-based embedding simulation
		words.forEach((word, wordIndex) => {
			for (let i = 0; i < word.length; i++) {
				const charCode = word.charCodeAt(i);
				const index = (charCode + wordIndex * 7 + i * 3) % vector.length;
				vector[index] += Math.sin(charCode * 0.1) * Math.cos(wordIndex * 0.2);
			}
		});

		// Normalize vector
		const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
		return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
	}, []);

	// Distance metrics
	const calculateDistance = useCallback((vec1: number[], vec2: number[], metric: DistanceMetric): number => {
		switch (metric) {
			case "cosine":
				const dot = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
				return Math.max(0, dot); // Cosine similarity (0 to 1)

			case "euclidean":
				const euclidean = Math.sqrt(vec1.reduce((sum, a, i) => sum + Math.pow(a - vec2[i], 2), 0));
				return Math.max(0, 1 - euclidean / 2); // Normalized to 0-1

			case "manhattan":
				const manhattan = vec1.reduce((sum, a, i) => sum + Math.abs(a - vec2[i]), 0);
				return Math.max(0, 1 - manhattan / vec1.length); // Normalized to 0-1

			case "dot":
				return Math.max(
					0,
					vec1.reduce((sum, a, i) => sum + a * vec2[i], 0)
				);

			default:
				return 0;
		}
	}, []);

	// Initialize Three.js scene
	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0f172a);

		const camera = new THREE.PerspectiveCamera(
			75,
			mountRef.current.clientWidth / mountRef.current.clientHeight,
			0.1,
			1000
		);
		camera.position.set(10, 10, 10);
		camera.lookAt(0, 0, 0);

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.setClearColor(0x0f172a);
		mountRef.current.appendChild(renderer.domElement);

		// Add lights
		const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(10, 10, 5);
		directionalLight.castShadow = true;
		scene.add(directionalLight);

		// Add coordinate system
		const axesHelper = new THREE.AxesHelper(15);
		scene.add(axesHelper);

		// Add grid
		const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
		scene.add(gridHelper);

		// Add orbit controls for easy navigation
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true; // Smooth camera movements
		controls.dampingFactor = 0.05;
		controls.screenSpacePanning = false;
		controls.minDistance = 5;
		controls.maxDistance = 50;
		controls.maxPolarAngle = Math.PI; // Allow full rotation
		controls.autoRotate = false;
		controls.autoRotateSpeed = 0.5;
		controlsRef.current = controls;

		// Group for connection lines
		const linesGroup = new THREE.Group();
		scene.add(linesGroup);

		sceneRef.current = scene;
		rendererRef.current = renderer;
		cameraRef.current = camera;
		linesRef.current = linesGroup;

		// Click handling
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		const onCanvasClick = (event: MouseEvent) => {
			// Only handle clicks if not dragging the camera
			if (controls.getDistance() !== controls.getDistance()) return; // Skip if controls are being used

			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(Array.from(pointsRef.current.values()));

			if (intersects.length > 0) {
				const clickedPoint = intersects[0].object;
				const vectorId = Array.from(pointsRef.current.entries()).find(
					([_, mesh]) => mesh === clickedPoint
				)?.[0];

				if (vectorId) {
					setSelectedVector(vectorId);
				}
			} else {
				setSelectedVector(null);
			}
		};

		renderer.domElement.addEventListener("click", onCanvasClick);

		// Animation loop
		const animate = () => {
			animationRef.current = requestAnimationFrame(animate);

			// Update controls for smooth damping
			if (controls) {
				controls.update();
			}

			// Add some rotation to points for visual feedback
			pointsRef.current.forEach((mesh) => {
				mesh.rotation.y += 0.01;
			});

			renderer.render(scene, camera);
		};
		animate();

		// Handle resize
		const handleResize = () => {
			if (!mountRef.current) return;
			camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
		};

		window.addEventListener("resize", handleResize);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			renderer.domElement.removeEventListener("click", onCanvasClick);
			window.removeEventListener("resize", handleResize);
			if (mountRef.current && renderer.domElement) {
				mountRef.current.removeChild(renderer.domElement);
			}
			if (controlsRef.current) {
				controlsRef.current.dispose();
			}
			renderer.dispose();
		};
	}, []);

	// Update 3D visualization
	useEffect(() => {
		if (!sceneRef.current || !rendererRef.current) return;

		// Clear existing points
		pointsRef.current.forEach((mesh) => {
			sceneRef.current!.remove(mesh);
		});
		pointsRef.current.clear();

		// Add new points
		vectors.forEach((vector) => {
			const geometry = new THREE.SphereGeometry(0.3, 16, 16);
			const material = new THREE.MeshLambertMaterial({
				color: selectedVector === vector.id ? 0xff6b6b : parseInt(vector.color.replace("#", ""), 16),
				transparent: true,
				opacity: selectedVector && selectedVector !== vector.id ? 0.3 : 1.0,
			});

			const sphere = new THREE.Mesh(geometry, material);
			sphere.position.copy(vector.position);
			sphere.castShadow = true;

			sceneRef.current!.add(sphere);
			pointsRef.current.set(vector.id, sphere);
		});

		// Update connection lines
		if (linesRef.current) {
			linesRef.current.clear();

			if (selectedVector && similarities.length > 0) {
				similarities.forEach((sim) => {
					const vec1 = vectors.find((v) => v.id === sim.id1);
					const vec2 = vectors.find((v) => v.id === sim.id2);

					if (vec1 && vec2 && (sim.id1 === selectedVector || sim.id2 === selectedVector)) {
						const geometry = new THREE.BufferGeometry().setFromPoints([vec1.position, vec2.position]);

						const opacity = sim.score;
						const color = new THREE.Color().setHSL(0.3 * sim.score, 1, 0.5);

						const material = new THREE.LineBasicMaterial({
							color: color,
							transparent: true,
							opacity: opacity * 0.7,
						});

						const line = new THREE.Line(geometry, material);
						linesRef.current!.add(line);
					}
				});
			}
		}
	}, [vectors, selectedVector, similarities]);

	// Calculate similarities when selection or metric changes
	useEffect(() => {
		if (!selectedVector) {
			setSimilarities([]);
			return;
		}

		const selectedVec = vectors.find((v) => v.id === selectedVector);
		if (!selectedVec) return;

		const newSimilarities: Similarity[] = [];

		vectors.forEach((vector) => {
			if (vector.id !== selectedVector) {
				const score = calculateDistance(selectedVec.vector, vector.vector, distanceMetric);
				newSimilarities.push({
					id1: selectedVector,
					id2: vector.id,
					text1: selectedVec.text,
					text2: vector.text,
					score,
				});
			}
		});

		newSimilarities.sort((a, b) => b.score - a.score);
		setSimilarities(newSimilarities);
	}, [selectedVector, distanceMetric, vectors, calculateDistance]);

	const addVector = () => {
		if (!inputText.trim()) return;

		const vector = textToVector(inputText);

		// Map high-dimensional vector to 3D space using PCA-like projection
		const x = vector.slice(0, 42).reduce((sum, val) => sum + val, 0) * 8;
		const y = vector.slice(43, 85).reduce((sum, val) => sum + val, 0) * 8;
		const z = vector.slice(86, 128).reduce((sum, val) => sum + val, 0) * 8;

		const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

		const newVector: TextVector = {
			id: Date.now().toString(),
			text: inputText,
			vector,
			position: new THREE.Vector3(x, y, z),
			color: colors[vectors.length % colors.length],
		};

		setVectors((prev) => [...prev, newVector]);
		setInputText("");
	};

	const addSampleTexts = () => {
		const newVectors: TextVector[] = [];
		const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

		SAMPLE_TEXTS.forEach((text, index) => {
			const vector = textToVector(text);
			const x = vector.slice(0, 42).reduce((sum, val) => sum + val, 0) * 8;
			const y = vector.slice(43, 85).reduce((sum, val) => sum + val, 0) * 8;
			const z = vector.slice(86, 128).reduce((sum, val) => sum + val, 0) * 8;

			newVectors.push({
				id: `sample-${index}`,
				text,
				vector,
				position: new THREE.Vector3(x, y, z),
				color: colors[index % colors.length],
			});
		});

		setVectors(newVectors);
		setSelectedVector(null);
	};

	const removeVector = (id: string) => {
		setVectors((prev) => prev.filter((v) => v.id !== id));
		if (selectedVector === id) {
			setSelectedVector(null);
		}
	};

	const resetVisualization = () => {
		setVectors([]);
		setSelectedVector(null);
		setSimilarities([]);
	};

	const getSimilarityColor = (score: number) => {
		if (score > 0.8) return "text-green-400";
		if (score > 0.6) return "text-yellow-400";
		if (score > 0.4) return "text-orange-400";
		return "text-red-400";
	};

	const getSimilarityBadge = (score: number) => {
		if (score > 0.8) return "High";
		if (score > 0.6) return "Medium";
		if (score > 0.4) return "Low";
		return "Very Low";
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 text-white">
			<div className="relative z-10 container mx-auto p-6">
				{/* Header */}
				<div className="mb-12 text-center">
					<h1 className="text-6xl font-extrabold bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 drop-shadow-lg">
						Vector Search & Embedding Visualizer
					</h1>
					<p className="text-slate-300 text-xl max-w-2xl mx-auto leading-relaxed">
						Add text, see embeddings, and explore semantic similarity in interactive 3D space
					</p>
					<div className="mt-6 w-24 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto rounded-full"></div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					{/* Controls Panel */}
					<div className="lg:col-span-1 space-y-6">
						{/* Add Text Card */}
						<Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300">
							<div className="p-6">
								<h3 className="text-xl font-bold mb-6 text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text flex items-center gap-2">
									<div className="w-2 h-8 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></div>
									Add Text
								</h3>

								<div className="space-y-5">
									<div>
										<Label htmlFor="text-input" className="text-slate-200 font-medium mb-2 block">
											Enter text to embed
										</Label>
										<div className="relative">
											<Input
												id="text-input"
												value={inputText}
												onChange={(e) => setInputText(e.target.value)}
												placeholder="Type your text here..."
												className="bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 backdrop-blur-sm"
												onKeyDown={(e) => e.key === "Enter" && addVector()}
											/>
											<div className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-400/20 via-transparent to-purple-400/20 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
										</div>
									</div>

									<Button
										onClick={addVector}
										className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3 shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 transform hover:scale-[1.02]"
									>
										<Plus className="w-5 h-5 mr-2" />
										Add Vector
									</Button>
									<div className="relative">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t border-white/10"></div>
										</div>
										<div className="relative flex justify-center text-sm">
											<span className="bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 px-4 text-slate-400">
												Quick Actions
											</span>
										</div>
									</div>

									<div className="grid gap-3">
										<Button
											onClick={addSampleTexts}
											variant="outline"
											className="w-full border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-cyan-400/50 transition-all duration-200 backdrop-blur-sm"
										>
											<span className="mr-2">✨</span>
											Load Sample Data
										</Button>

										<Button
											onClick={resetVisualization}
											variant="outline"
											className="w-full border-red-400/30 text-red-300 hover:bg-red-500/10 hover:text-red-200 hover:border-red-400 transition-all duration-200"
										>
											<RotateCcw className="w-4 h-4 mr-2" />
											Reset All
										</Button>
									</div>
								</div>
							</div>
						</Card>

						{/* Distance Metric Card */}
						<Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
							<div className="p-6">
								<h3 className="text-xl font-bold mb-6 text-transparent bg-gradient-to-r from-purple-300 to-pink-400 bg-clip-text flex items-center gap-2">
									<div className="w-2 h-8 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full"></div>
									Distance Metric
								</h3>

								<Select
									value={distanceMetric}
									onValueChange={(value: DistanceMetric) => setDistanceMetric(value)}
								>
									<SelectTrigger className="bg-white/10 border border-white/20 text-white hover:border-purple-400/50 focus:border-purple-400 transition-all duration-200 backdrop-blur-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="bg-gray-900/95 backdrop-blur-md border border-white/20">
										<SelectItem value="cosine" className="hover:bg-white/10">
											Cosine Similarity
										</SelectItem>
										<SelectItem value="euclidean" className="hover:bg-white/10">
											Euclidean Distance
										</SelectItem>
										<SelectItem value="manhattan" className="hover:bg-white/10">
											Manhattan Distance
										</SelectItem>
										<SelectItem value="dot" className="hover:bg-white/10">
											Dot Product
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</Card>

						{/* Text Vectors List */}
						{vectors.length > 0 && (
							<Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
								<div className="p-6">
									<h3 className="text-xl font-bold mb-6 text-transparent bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text flex items-center gap-2">
										<div className="w-2 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full"></div>
										Text Vectors
										<span className="ml-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm rounded-full font-normal">
											{vectors.length}
										</span>
									</h3>

									<div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
										{vectors.map((vector) => (
											<div
												key={vector.id}
												className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${
													selectedVector === vector.id
														? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/50 shadow-lg shadow-cyan-500/10"
														: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
												}`}
												onClick={() => setSelectedVector(vector.id)}
											>
												<div className="flex items-start justify-between">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-3 mb-2">
															<div
																className="w-4 h-4 rounded-full ring-2 ring-white/20 shadow-lg"
																style={{ backgroundColor: vector.color }}
															/>
															<span className="text-xs text-slate-400 font-mono bg-black/20 px-2 py-1 rounded">
																#{vector.id.slice(-4)}
															</span>
														</div>
														<p className="text-sm text-slate-200 leading-relaxed line-clamp-2">
															{vector.text}
														</p>
													</div>
													<Button
														size="sm"
														variant="ghost"
														onClick={(e) => {
															e.stopPropagation();
															removeVector(vector.id);
														}}
														className="ml-3 p-2 h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											</div>
										))}
									</div>
								</div>
							</Card>
						)}
					</div>

					{/* 3D Visualization */}
					<div className="lg:col-span-2">
						<Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 h-fit">
							<div className="p-6 h-full flex flex-col">
								<h3 className="text-2xl font-bold mb-6 text-transparent bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-300 bg-clip-text flex items-center gap-2">
									<div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-teal-500 rounded-full"></div>
									3D Vector Space
								</h3>

								<div className="flex-1 relative">
									<div
										ref={mountRef}
										className="w-full h-[600px] rounded-xl bg-gradient-to-br from-gray-950/50 to-blue-950/30 border border-white/20 overflow-hidden cursor-grab active:cursor-grabbing shadow-inner backdrop-blur-sm"
									/>

									{/* Glassmorphism overlay for controls */}
									<div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4">
										<div className="text-sm text-slate-300 flex flex-wrap gap-4">
											<span className="flex items-center gap-2">
												<span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
												Left drag: Rotate
											</span>
											<span className="flex items-center gap-2">
												<span className="w-2 h-2 bg-purple-400 rounded-full"></span>
												Right drag: Pan
											</span>
											<span className="flex items-center gap-2">
												<span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
												Scroll: Zoom
											</span>
											<span className="flex items-center gap-2">
												<span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
												Click dots: Select
											</span>
										</div>
									</div>
								</div>
							</div>
						</Card>
					</div>

					{/* Similarity Results */}
					<div className="lg:col-span-1">
						<Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl hover:shadow-pink-500/10 transition-all duration-300">
							<div className="p-6">
								<h3 className="text-xl font-bold mb-6 text-transparent bg-gradient-to-r from-pink-300 to-rose-400 bg-clip-text flex items-center gap-2">
									<div className="w-2 h-8 bg-gradient-to-b from-pink-400 to-rose-500 rounded-full"></div>
									Similarity Results
								</h3>

								{selectedVector ? (
									<div className="space-y-5">
										<div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-400/30 shadow-lg backdrop-blur-sm">
											<h4 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
												<span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
												Selected Text:
											</h4>
											<p className="text-sm text-slate-200 leading-relaxed">
												{vectors.find((v) => v.id === selectedVector)?.text}
											</p>
										</div>

										<div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
											{similarities.map((sim) => (
												<div
													key={`${sim.id1}-${sim.id2}`}
													className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
												>
													<div className="flex items-center justify-between mb-3">
														<Badge
															variant="outline"
															className={`${getSimilarityColor(
																sim.score
															)} border-current px-3 py-1 font-medium backdrop-blur-sm bg-white/10`}
														>
															{getSimilarityBadge(sim.score)}
														</Badge>
														<div className="text-right">
															<span
																className={`text-lg font-bold font-mono ${getSimilarityColor(
																	sim.score
																)}`}
															>
																{sim.score.toFixed(3)}
															</span>
															<div className="text-xs text-slate-400">similarity</div>
														</div>
													</div>

													<p className="text-sm text-slate-300 leading-relaxed mb-3 line-clamp-3">
														{sim.text2}
													</p>

													<div className="relative bg-white/10 rounded-full h-2 overflow-hidden">
														<div
															className={`h-full transition-all duration-700 ease-out rounded-full ${
																sim.score > 0.8
																	? "bg-gradient-to-r from-green-400 to-emerald-500"
																	: sim.score > 0.6
																	? "bg-gradient-to-r from-yellow-400 to-amber-500"
																	: sim.score > 0.4
																	? "bg-gradient-to-r from-orange-400 to-red-500"
																	: "bg-gradient-to-r from-red-500 to-pink-500"
															}`}
															style={{ width: `${sim.score * 100}%` }}
														/>
														<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className="text-center py-16">
										<div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
											<span className="text-4xl">🎯</span>
										</div>
										<h4 className="text-lg font-semibold text-slate-200 mb-2">Select a Vector</h4>
										<p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
											Click on a point in the 3D space to see similarity scores and comparisons
										</p>
									</div>
								)}
							</div>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
