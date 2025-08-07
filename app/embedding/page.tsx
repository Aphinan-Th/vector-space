"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Type, Binary, Settings } from "lucide-react";

const TextToVectorAnimation = () => {
	const [inputText, setInputText] = useState<string>("");
	const [vector, setVector] = useState<number[]>([]);
	const [showAnimation, setShowAnimation] = useState<boolean>(false);
	const [dimensions, setDimensions] = useState<number>(8);
	const [progressWidth, setProgressWidth] = useState<number>(0);

	// Simple text to vector conversion (simulate embedding)
	const textToVector = (text: string, dims: number) => {
		if (!text.trim()) return [];

		// Simple hash-based vector generation for demo
		const result = [];

		for (let i = 0; i < dims; i++) {
			let hash = 0;
			const str = text + i.toString();
			for (let j = 0; j < str.length; j++) {
				const char = str.charCodeAt(j);
				hash = (hash << 5) - hash + char;
				hash = hash & hash; // Convert to 32-bit integer
			}
			// Normalize to [-1, 1]
			result.push((hash % 2000) / 1000 - 1);
		}

		return result;
	};

	const handleConvert = () => {
		if (!inputText.trim()) return;

		setShowAnimation(true);
		setProgressWidth(0);

		const interval = setInterval(() => {
			setProgressWidth((prev) => {
				if (prev >= 100) {
					clearInterval(interval);
					return 100;
				}
				return prev + 10;
			});
		}, 100);

		setTimeout(() => {
			const newVector = textToVector(inputText, dimensions);
			setVector(newVector);
		}, 2200);
	};

	const reset = () => {
		setInputText("");
		setVector([]);
		setShowAnimation(false);
		setProgressWidth(0);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white p-6">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
						Text to Vector
					</h1>
					<p className="text-slate-400 text-lg">See how your text becomes a mathematical vector</p>
				</div>

				{/* Input Section */}
				<Card className="bg-white/10 backdrop-blur border-white/20 p-8 mb-8">
					<div className="flex flex-col gap-6">
						<div>
							<Label className="text-slate-300 font-medium mb-3 block">Enter your text:</Label>
							<Textarea
								value={inputText}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
								placeholder="Type anything here..."
								className="bg-white/10 border-white/30 text-white text-lg py-4 focus:border-blue-400 min-h-[120px] resize-y"
								onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
									e.key === "Enter" && e.ctrlKey && handleConvert()
								}
							/>
							<div className="text-xs text-slate-400 mt-1">Press Ctrl+Enter to convert to vector</div>
						</div>

						<div>
							<Label className="text-slate-300 font-medium mb-3 block">Vector Dimensions:</Label>
							<div className="flex gap-4 items-start">
								<div className="flex-1">
									<Input
										type="number"
										value={dimensions}
										onChange={(e) => setDimensions(Math.max(1, parseInt(e.target.value) || 1))}
										min="1"
										max="1000"
										placeholder="Enter dimensions..."
										className="bg-white/10 border-white/30 text-white text-lg py-4 focus:border-blue-400"
									/>
									<div className="text-xs text-slate-400 mt-1">
										Enter any number between 1 and 1000 dimensions
									</div>
								</div>
								<Button
									onClick={handleConvert}
									disabled={!inputText.trim()}
									className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-white font-semibold shadow-lg"
								>
									Convert to Vector
								</Button>
								<Button
									onClick={reset}
									variant="outline"
									className="border-2 border-slate-500 text-slate-300 hover:bg-slate-700 hover:border-slate-400 px-8 py-4 font-semibold"
								>
									Reset
								</Button>
							</div>
						</div>
					</div>
				</Card>

				{/* Conversion Animation */}
				{showAnimation && (
					<div className="grid md:grid-cols-5 gap-6 mb-8">
						{/* Text Input */}
						<Card className="bg-white/5 backdrop-blur border-white/10 p-6">
							<div className="text-center">
								<div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
									<Type className="w-8 h-8 text-blue-400" />
								</div>
								<h3 className="text-xl font-semibold mb-4 text-blue-300">Text Input</h3>
								<div className="bg-white/10 rounded-lg p-4">
									<p className="text-slate-200 break-words">&quot;{inputText}&quot;</p>
								</div>
							</div>
						</Card>

						{/* Arrow 1 */}
						<div className="flex items-center justify-center">
							<div className="animate-pulse">
								<ArrowRight className="w-8 h-8 text-purple-400" />
							</div>
						</div>

						{/* Model Processing */}
						<Card className="bg-white/5 backdrop-blur border-white/10 p-6">
							<div className="text-center">
								<div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
									<Settings className="w-6 h-6 text-amber-400 animate-spin" />
									<Settings
										className="w-4 h-4 text-amber-300 absolute animate-spin"
										style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
									/>
								</div>
								<h3 className="text-xl font-semibold mb-4 text-amber-300">AI Model</h3>
								<div className="bg-white/10 rounded-lg p-4">
									<p className="text-slate-400 text-sm">Processing...</p>
									<div className="w-full bg-gray-200/20 rounded-full h-2 mt-2">
										<div
											className="bg-amber-400 h-2 rounded-full transition-all ease-out"
											style={{
												width: `${progressWidth}%`,
											}}
										></div>
									</div>
								</div>
							</div>
						</Card>

						{/* Arrow 2 */}
						<div className="flex items-center justify-center">
							<div className="animate-pulse">
								<ArrowRight className="w-8 h-8 text-purple-400" />
							</div>
						</div>

						{/* Vector Output */}
						<Card className="bg-white/5 backdrop-blur border-white/10 p-6">
							<div className="text-center">
								<div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
									<Binary className="w-8 h-8 text-purple-400" />
								</div>
								<h3 className="text-xl font-semibold mb-4 text-purple-300">Vector Output</h3>
								<div className="text-sm text-slate-400 mb-2">{vector.length} dimensions</div>
							</div>
						</Card>
					</div>
				)}

				{/* Vector Visualization */}
				{vector.length > 0 && (
					<Card className="bg-white/5 backdrop-blur border-white/10 p-8">
						<h3 className="text-2xl font-semibold mb-6 text-center text-transparent bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text">
							Your Text as Numbers
						</h3>

						{/* Vector Display */}
						<div
							className={`grid mb-8 ${
								vector.length <= 8
									? "grid-cols-2 md:grid-cols-4 gap-4"
									: vector.length <= 16
									? "grid-cols-4 md:grid-cols-8 gap-3"
									: vector.length <= 32
									? "grid-cols-6 md:grid-cols-10 gap-2"
									: vector.length <= 64
									? "grid-cols-8 md:grid-cols-16 gap-1"
									: "grid-cols-10 md:grid-cols-20 gap-1"
							}`}
						>
							{vector.map((value, index) => (
								<div
									key={index}
									className={`rounded text-center transition-all duration-300 transform hover:scale-105 ${
										vector.length <= 8
											? "p-3"
											: vector.length <= 16
											? "p-2"
											: vector.length <= 32
											? "p-1.5"
											: "p-1"
									} ${
										value >= 0
											? "bg-green-500/20 border border-green-400/30"
											: "bg-red-500/20 border border-red-400/30"
									}`}
									style={{
										animationDelay: `${index * 30}ms`,
										animation: "fadeInUp 0.5s ease-out forwards",
									}}
								>
									<div
										className={`text-slate-400 mb-1 ${
											vector.length <= 16
												? "text-xs"
												: vector.length <= 64
												? "text-[10px]"
												: "text-[8px]"
										}`}
									>
										{vector.length <= 32 ? `D${index + 1}` : `${index + 1}`}
									</div>
									<div
										className={`font-mono font-bold ${
											vector.length <= 8
												? "text-sm"
												: vector.length <= 16
												? "text-xs"
												: vector.length <= 64
												? "text-[10px]"
												: "text-[8px]"
										} ${value >= 0 ? "text-green-400" : "text-red-400"}`}
									>
										{value.toFixed(2)}
									</div>
								</div>
							))}
						</div>

						{/* Vector Array Display */}
						<div className="mb-8">
							<h4 className="text-lg font-semibold mb-4 text-slate-300">Vector Array</h4>
							<div className="bg-white/5 rounded-lg p-4 border border-white/10">
								<div className="max-h-32 overflow-y-auto custom-scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800">
									<code className="text-sm font-mono text-slate-300 break-all">
										[
										{vector.map((value, index) => (
											<span key={index}>
												<span className={value >= 0 ? "text-green-400" : "text-red-400"}>
													{value.toFixed(3)}
												</span>
												{index < vector.length - 1 && (
													<span className="text-slate-500">, </span>
												)}
											</span>
										))}
										]
									</code>
								</div>
								<div className="mt-2 text-xs text-slate-500">
									Scroll to see all {vector.length} values
								</div>
							</div>
						</div>

						{/* Vector Info */}
						<div className="bg-white/10 rounded-lg p-6 text-center">
							<div className="grid md:grid-cols-2 gap-6">
								<div>
									<div className="text-sm text-slate-400 mb-1">Vector Length</div>
									<div className="text-2xl font-bold text-cyan-400">
										{Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)).toFixed(4)}
									</div>
								</div>
								<div>
									<div className="text-sm text-slate-400 mb-1">Dimensions</div>
									<div className="text-2xl font-bold text-purple-400">{vector.length}D</div>
								</div>
							</div>

							<div className="mt-6 text-sm text-slate-300 bg-white/5 rounded-lg p-4">
								<p>
									<strong>What this means:</strong>
								</p>
								<p>
									Your text &quot;{inputText}&quot; is now represented as {vector.length} numbers.
									These numbers capture the meaning of your text in a way that computers can
									understand and compare with other texts.
								</p>
							</div>
						</div>
					</Card>
				)}

				{/* Instructions */}
				{!showAnimation && (
					<Card className="bg-white/5 backdrop-blur border-white/10 p-8 text-center">
						<h3 className="text-xl font-semibold mb-4 text-slate-300">How it works</h3>
						<p className="text-slate-400 mb-6 max-w-2xl mx-auto">
							Enter any text above and click &quot;Convert to Vector&quot; to see how your words transform
							into a mathematical representation that machines can understand.
						</p>

						<div className="grid md:grid-cols-3 gap-6 text-sm">
							<div className="bg-white/5 rounded-lg p-4">
								<div className="text-blue-400 font-medium mb-2">1. Input Text</div>
								<p className="text-slate-400">Your words and sentences</p>
							</div>
							<div className="bg-white/5 rounded-lg p-4">
								<div className="text-purple-400 font-medium mb-2">2. Processing</div>
								<p className="text-slate-400">Convert to numerical format</p>
							</div>
							<div className="bg-white/5 rounded-lg p-4">
								<div className="text-green-400 font-medium mb-2">3. Vector Output</div>
								<p className="text-slate-400">Array of numbers representing meaning</p>
							</div>
						</div>
					</Card>
				)}
			</div>

			<style jsx>{`
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</div>
	);
};

export default TextToVectorAnimation;
