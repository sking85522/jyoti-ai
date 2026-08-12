import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface AvatarProps {
  isSpeaking: boolean;
}

const AnimatedSphere = ({ isSpeaking }: AvatarProps) => {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sphereRef.current) {
      // Base rotation
      sphereRef.current.rotation.x += 0.005;
      sphereRef.current.rotation.y += 0.01;

      // Scale based on speaking state
      const targetScale = isSpeaking ? 1.2 + Math.sin(state.clock.elapsedTime * 10) * 0.1 : 1;
      sphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <Sphere ref={sphereRef} args={[1, 64, 64]} scale={1}>
      <MeshDistortMaterial
        color={isSpeaking ? "#00ffcc" : "#4f46e5"}
        attach="material"
        distort={isSpeaking ? 0.6 : 0.3}
        speed={isSpeaking ? 5 : 2}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  );
};

export const Avatar3D: React.FC<AvatarProps> = ({ isSpeaking }) => {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
        <AnimatedSphere isSpeaking={isSpeaking} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};
