"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { colorToHex } from "@/lib/avatar/avatar-feature-model";
import type { GameFace3DAvatarConfig } from "@/lib/avatar/gameface-3d-model";

export interface GameFace3DAvatarPreviewProps {
  config: GameFace3DAvatarConfig;
  fallback: ReactNode;
}

export function GameFace3DAvatarPreview({ config, fallback }: GameFace3DAvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [renderMetrics, setRenderMetrics] = useState<{ glbLoadMs: number; firstPortraitMs: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeCanvas = canvas;
    let cancelled = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let disposeScene: (() => void) | null = null;

    async function renderOnce() {
      try {
        const renderStartedAt = performance.now();
        const [THREE, { GLTFLoader }] = await Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js")]);
        if (cancelled) return;
        const gl = activeCanvas.getContext("webgl2") ?? activeCanvas.getContext("webgl");
        if (!gl) {
          setStatus("fallback");
          return;
        }

        renderer = new THREE.WebGLRenderer({
          canvas: activeCanvas,
          context: gl as WebGLRenderingContext,
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
          preserveDrawingBuffer: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(360, 360, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        scene.background = null;
        const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
        camera.position.set(0, 0.22, 5.6);
        camera.lookAt(0, 0.18, 0);

        const key = new THREE.DirectionalLight(0xffffff, 2.25);
        key.position.set(-2.4, 3.4, 4);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x80a8ff, 0.85);
        fill.position.set(2.4, 1.2, 2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0x65a3ff, 1.35);
        rim.position.set(0, 2.2, -3);
        scene.add(rim);
        scene.add(new THREE.AmbientLight(0x26344d, 1.2));

        const loader = new GLTFLoader();
        const glbLoadStartedAt = performance.now();
        const gltf = await loader.loadAsync(config.modelUrl);
        const glbLoadMs = performance.now() - glbLoadStartedAt;
        if (cancelled) return;
        const root = gltf.scene;
        root.rotation.set(-0.04, -0.18, 0);
        root.position.set(0, -0.16, 0);
        root.scale.setScalar(1.44);

        const resources: Array<{ dispose?: () => void }> = [];
        root.traverse((object) => {
          const mesh = object as unknown as {
            isMesh?: boolean;
            name?: string;
            material?: unknown;
            morphTargetDictionary?: Record<string, number>;
            morphTargetInfluences?: number[];
            geometry?: { dispose?: () => void };
          };
          if (!mesh.isMesh) return;
          if ((mesh.name ?? "").toLowerCase().includes("facial") && config.appearance.facialHairFamily === "none") {
            (mesh as unknown as { visible: boolean }).visible = false;
          }
          if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            for (const [id, value] of Object.entries(config.morphWeights)) {
              const index = mesh.morphTargetDictionary[id];
              if (typeof index === "number") mesh.morphTargetInfluences[index] = value;
            }
          }
          mesh.material = createMaterial(THREE, mesh.name ?? "", config);
          resources.push(mesh.geometry ?? {}, mesh.material as { dispose?: () => void });
        });

        scene.add(root);
        renderer.render(scene, camera);
        disposeScene = () => {
          resources.forEach((resource) => resource.dispose?.());
          scene.clear();
        };
        setRenderMetrics({
          glbLoadMs: Math.round(glbLoadMs),
          firstPortraitMs: Math.round(performance.now() - renderStartedAt)
        });
        setStatus("ready");
      } catch {
        setStatus("fallback");
      }
    }

    void renderOnce();
    return () => {
      cancelled = true;
      disposeScene?.();
      renderer?.dispose();
    };
  }, [config]);

  if (status === "fallback") return <>{fallback}</>;

  return (
    <div
      className="post-scan-avatar-preview post-scan-avatar-preview-3d"
      data-avatar-renderer="threejs-3d"
      data-avatar-source="scan-morphs"
      data-renderer-version={config.rendererVersion}
      data-glb-load-ms={renderMetrics?.glbLoadMs}
      data-first-portrait-ms={renderMetrics?.firstPortraitMs}
    >
      <canvas ref={canvasRef} className="post-scan-avatar-3d-canvas" width={360} height={360} aria-hidden="true" />
      <span className="post-scan-avatar-render-rim" aria-hidden="true" />
      {status === "loading" ? <span className="post-scan-avatar-3d-loading" aria-hidden="true" /> : null}
    </div>
  );
}

function createMaterial(
  THREE: typeof import("three"),
  name: string,
  config: GameFace3DAvatarConfig
): import("three").MeshStandardMaterial {
  const lower = name.toLowerCase();
  if (lower.includes("hair")) {
    return new THREE.MeshStandardMaterial({ color: colorToHex(config.appearance.hairTone), roughness: 0.62, metalness: 0.02 });
  }
  if (lower.includes("facial")) {
    return new THREE.MeshStandardMaterial({ color: colorToHex(config.appearance.facialHairTone), roughness: 0.74, metalness: 0.01 });
  }
  if (lower.includes("mouth") || lower.includes("lip")) {
    return new THREE.MeshStandardMaterial({ color: colorToHex(config.appearance.skinShadowTone), roughness: 0.64, metalness: 0.01 });
  }
  if (lower.includes("eye")) {
    return new THREE.MeshStandardMaterial({ color: colorToHex(config.appearance.eyeTone), roughness: 0.28, metalness: 0.04 });
  }
  if (lower.includes("jersey") || lower.includes("shoulder")) {
    return new THREE.MeshStandardMaterial({ color: "#1f3149", roughness: 0.68, metalness: 0.02 });
  }
  if (lower.includes("background")) {
    return new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.9, metalness: 0.01 });
  }
  return new THREE.MeshStandardMaterial({
    color: colorToHex(config.appearance.skinTone),
    roughness: 0.58,
    metalness: 0.015,
    emissive: colorToHex(config.appearance.skinShadowTone),
    emissiveIntensity: 0.04
  });
}
