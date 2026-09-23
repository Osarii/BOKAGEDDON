import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CharacterLabScene } from "../../scene/dev/CharacterLabScene";
import {
  DEFAULT_ASSET_PATH,
  STANDARD_CLIPS,
  type ModelTelemetry,
  type CameraPreset,
  type LoadedGLBData,
} from "../../scene/dev/characterLabTypes";
import {
  Play,
  Pause,
  RotateCcw,
  Box,
  Layers,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Camera,
} from "lucide-react";
import "../../styles/character-lab.css";

export const CharacterLab: React.FC = () => {
  // Asset state
  const [assetPath, setAssetPath] = useState<string>(DEFAULT_ASSET_PATH);
  const [assetStatus, setAssetStatus] = useState<"loading" | "loaded" | "error" | "dummy">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelData, setModelData] = useState<LoadedGLBData | null>(null);
  const [useDummy, setUseDummy] = useState<boolean>(false);
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animation state
  const [activeClip, setActiveClip] = useState<string>("Idle");
  const [availableClips, setAvailableClips] = useState<string[]>(STANDARD_CLIPS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);
  const [animTime, setAnimTime] = useState<number>(0);
  const [animDuration, setAnimDuration] = useState<number>(2.0);

  // Transform state
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [visualYOffset, setVisualYOffset] = useState<number>(0.0);
  const [rotationY, setRotationY] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Camera & Viewport
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("isometric");

  // Visual QA Helpers Toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showOrigin, setShowOrigin] = useState<boolean>(true);
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);
  const [showGroundingLine, setShowGroundingLine] = useState<boolean>(true);
  const [showShadows, setShowShadows] = useState<boolean>(true);

  // Telemetry (initialized with neutral baseline)
  const [telemetry, setTelemetry] = useState<ModelTelemetry>({
    width: 0.8,
    height: 1.85,
    depth: 0.6,
    minY: 0.0,
    maxY: 1.85,
    feetMinY: 0.0,
    meshCount: 12,
    clipCount: 5,
    vertexCount: 1420,
    triangleCount: 1180,
  });

  // Apply parsed GLTF data and extract clips directly without render side effects
  const applyLoadedGLTF = useCallback((gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }) => {
    setModelData({
      scene: gltf.scene,
      animations: gltf.animations,
    });
    setUseDummy(false);
    setAssetStatus("loaded");
    setErrorMessage(null);

    const clipNames = gltf.animations.map((a) => a.name);
    const clips = clipNames.length > 0 ? clipNames : STANDARD_CLIPS;
    setAvailableClips(clips);
    setActiveClip((prev) => {
      const match = clips.find((c) => c.toLowerCase() === prev.toLowerCase());
      return match || clips[0] || "Idle";
    });
  }, []);

  // Load GLB file from URL or Blob
  const loadGLB = useCallback(
    (url: string, isBlob: boolean = false) => {
      const performLoad = async () => {
        setAssetStatus("loading");
        setErrorMessage(null);

        if (!isBlob) {
          try {
            const headCheck = await fetch(url, { method: "HEAD" });
            if (!headCheck.ok) {
              setAssetStatus("error");
              setErrorMessage(`Asset unavailable: ${url} (HTTP ${headCheck.status})`);
              setModelData(null);
              return;
            }
          } catch (err) {
            setAssetStatus("error");
            setErrorMessage(`Error conectando con ${url}: ${(err as Error).message}`);
            setModelData(null);
            return;
          }
        }

        const loader = new GLTFLoader();
        loader.load(
          url,
          (gltf) => {
            applyLoadedGLTF(gltf);
          },
          undefined,
          (error) => {
            setAssetStatus("error");
            setErrorMessage(`Error parseando GLB: ${error instanceof Error ? error.message : "Formato inválido"}`);
            setModelData(null);
          }
        );
      };

      void performLoad();
    },
    [applyLoadedGLTF]
  );

  // Initial load on mount using async probe
  useEffect(() => {
    let cancelled = false;

    const probeInitialAsset = async () => {
      try {
        const res = await fetch(DEFAULT_ASSET_PATH, { method: "HEAD" });
        if (cancelled) return;
        if (!res.ok) {
          setAssetStatus("error");
          setErrorMessage(`Asset unavailable: ${DEFAULT_ASSET_PATH} (HTTP ${res.status})`);
          setModelData(null);
          return;
        }

        const loader = new GLTFLoader();
        loader.load(
          DEFAULT_ASSET_PATH,
          (gltf) => {
            if (cancelled) return;
            applyLoadedGLTF(gltf);
          },
          undefined,
          (err) => {
            if (cancelled) return;
            setAssetStatus("error");
            setErrorMessage(`Error parseando GLB: ${err instanceof Error ? err.message : "Formato inválido"}`);
          }
        );
      } catch (err) {
        if (cancelled) return;
        setAssetStatus("error");
        setErrorMessage(`Error conectando con ${DEFAULT_ASSET_PATH}: ${(err as Error).message}`);
      }
    };

    void probeInitialAsset();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [applyLoadedGLTF]);

  // Handle local file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;
    setAssetPath(file.name);
    loadGLB(blobUrl, true);
  }, [loadGLB]);

  // Switch to procedural dummy
  const activateDummy = useCallback(() => {
    setUseDummy(true);
    setAssetStatus("dummy");
    setErrorMessage(null);
    setAvailableClips(STANDARD_CLIPS);
    setActiveClip("Idle");
  }, []);

  // Auto-ground calculation: set visualYOffset to cancel out feetMinY
  const handleAutoGround = useCallback(() => {
    setVisualYOffset((prev) => Math.round((prev - telemetry.feetMinY) * 1000) / 1000);
  }, [telemetry.feetMinY]);

  // Stabilized callbacks passed to 3D scene
  const handleCameraMovedToFree = useCallback(() => {
    setCameraPreset((prev) => (prev === "free" ? prev : "free"));
  }, []);

  const handleTelemetryUpdate = useCallback((next: ModelTelemetry) => {
    setTelemetry((prev) => {
      // Bail out if values haven't changed meaningfully
      if (
        Math.abs(prev.feetMinY - next.feetMinY) < 0.002 &&
        Math.abs(prev.minY - next.minY) < 0.002 &&
        Math.abs(prev.maxY - next.maxY) < 0.002 &&
        Math.abs(prev.width - next.width) < 0.002 &&
        prev.meshCount === next.meshCount &&
        prev.clipCount === next.clipCount
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const handleTimeUpdate = useCallback((time: number, duration: number) => {
    setAnimTime(time);
    setAnimDuration((prev) => (Math.abs(prev - duration) > 0.01 ? duration : prev));
  }, []);

  // Keyboard hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "1") {
        setCameraPreset("isometric");
      } else if (e.key === "2") {
        setCameraPreset("front");
      } else if (e.key === "3") {
        setCameraPreset("side");
      } else if (e.key === "4") {
        setCameraPreset("back");
      } else if (e.key.toLowerCase() === "g") {
        setShowGrid((g) => !g);
      } else if (e.key.toLowerCase() === "b") {
        setShowBoundingBox((b) => !b);
      } else if (e.key.toLowerCase() === "o") {
        setShowOrigin((o) => !o);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Compute grounding status classification
  const isGrounded = Math.abs(telemetry.feetMinY) < 0.015;
  const isFloating = telemetry.feetMinY >= 0.015;
  const isSinking = telemetry.feetMinY <= -0.015;
  const groundingStateClass = isGrounded ? "grounded" : isFloating ? "floating" : "sinking";

  return (
    <div className="character-lab-container">
      {/* Hidden File Input for .glb upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Top Header & Toolbar */}
      <header className="character-lab-header">
        <div className="character-lab-header-left">
          <Link to="/" className="character-lab-back-btn" title="Volver al Menú Principal">
            <ArrowLeft size={14} /> Menú
          </Link>
          <div className="character-lab-title">
            <span>BONKAGEDDON</span>
            <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>//</span>
            <span>Character Visual QA Lab</span>
            <span className="character-lab-badge-dev">DEV ROUTE</span>
          </div>
        </div>

        {/* Camera Presets in Center Header */}
        <div className="character-lab-header-center">
          <button
            className={`camera-preset-btn ${cameraPreset === "isometric" ? "active" : ""}`}
            onClick={() => setCameraPreset("isometric")}
            title="Vista Isométrica (Tecla 1)"
          >
            <Camera size={13} /> Isométrica
          </button>
          <button
            className={`camera-preset-btn ${cameraPreset === "front" ? "active" : ""}`}
            onClick={() => setCameraPreset("front")}
            title="Vista Frontal (Tecla 2)"
          >
            Frontal
          </button>
          <button
            className={`camera-preset-btn ${cameraPreset === "side" ? "active" : ""}`}
            onClick={() => setCameraPreset("side")}
            title="Vista Lateral (Tecla 3)"
          >
            Lateral
          </button>
          <button
            className={`camera-preset-btn ${cameraPreset === "back" ? "active" : ""}`}
            onClick={() => setCameraPreset("back")}
            title="Vista Trasera (Tecla 4)"
          >
            Trasera
          </button>
        </div>

        <div className="character-lab-header-right">
          <div className={`asset-status-pill ${assetStatus}`}>
            {assetStatus === "loaded" && <CheckCircle2 size={13} />}
            {assetStatus === "dummy" && <Box size={13} />}
            {assetStatus === "loading" && <RotateCcw size={13} className="spin" />}
            {assetStatus === "error" && <AlertTriangle size={13} />}
            <span>
              {assetStatus === "loaded" && "GLB Activo"}
              {assetStatus === "dummy" && "Maniquí Procedural"}
              {assetStatus === "loading" && "Cargando..."}
              {assetStatus === "error" && "Asset Unavailable"}
            </span>
          </div>
        </div>
      </header>

      {/* 3D Canvas Viewport */}
      <div className="character-lab-canvas-wrap">
        <CharacterLabScene
          modelData={modelData}
          useDummy={useDummy}
          activeClip={activeClip}
          isPlaying={isPlaying}
          animSpeed={animSpeed}
          animTime={animTime}
          modelScale={modelScale}
          visualYOffset={visualYOffset}
          rotationY={rotationY}
          autoRotate={autoRotate}
          cameraPreset={cameraPreset}
          showGrid={showGrid}
          showOrigin={showOrigin}
          showBoundingBox={showBoundingBox}
          showGroundingLine={showGroundingLine}
          showShadows={showShadows}
          onTelemetryUpdate={handleTelemetryUpdate}
          onTimeUpdate={handleTimeUpdate}
          onCameraMovedToFree={handleCameraMovedToFree}
        />
      </div>

      {/* Asset Unavailable Fallback Card (Displayed when GLB is 404/Missing) */}
      {assetStatus === "error" && !useDummy && (
        <div className="asset-unavailable-card">
          <div className="asset-unavailable-title">
            <AlertTriangle size={22} />
            <span>Asset 3D no disponible aún</span>
          </div>
          <p className="asset-unavailable-desc">
            El archivo GLB configurado no se encuentra en el servidor. Puedes probar todas las
            herramientas de QA de inmediato con el maniquí procedural o cargar un archivo local.
          </p>
          <div className="asset-unavailable-path">{assetPath}</div>
          <div className="asset-unavailable-actions">
            <button className="btn-primary-lab" onClick={activateDummy}>
              <Box size={14} style={{ display: "inline", marginRight: "6px" }} />
              Cargar Maniquí Procedural
            </button>
            <button
              className="btn-secondary-lab"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} style={{ display: "inline", marginRight: "6px" }} />
              Subir .glb local
            </button>
            <button
              className="btn-secondary-lab"
              onClick={() => loadGLB(assetPath)}
            >
              <RotateCcw size={14} style={{ display: "inline", marginRight: "6px" }} />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Floating Left Panel: Asset & Animation QA Controls */}
      <div className="character-lab-panel character-lab-panel-left">
        {/* Section 1: Asset Loader */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Asset GLB</span>
            <span className="count-pill">
              {useDummy ? "DUMMY" : assetStatus.toUpperCase()}
            </span>
          </div>
          <div className="asset-loader-form">
            <div className="asset-input-row">
              <input
                type="text"
                className="asset-input-field"
                value={assetPath}
                onChange={(e) => setAssetPath(e.target.value)}
                placeholder="/assets/characters/tank-v2.glb"
              />
              <button
                className="asset-btn"
                onClick={() => loadGLB(assetPath)}
                title="Cargar ruta especificada"
              >
                Cargar
              </button>
            </div>
            <div className="asset-actions-row">
              <button
                className="asset-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Cargar archivo .glb desde disco"
              >
                <Upload size={12} /> Cargar local
              </button>
              <button
                className={`asset-btn dummy-toggle-btn ${useDummy ? "active" : ""}`}
                onClick={activateDummy}
                title="Alternar Maniquí Procedural"
              >
                <Box size={12} /> Maniquí Test
              </button>
            </div>
            {errorMessage && (
              <div style={{ color: "#f87171", fontSize: "0.65rem", marginTop: "2px" }}>
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Standard Animation Clips */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Clips de Animación</span>
            <span className="count-pill">{availableClips.length} clips</span>
          </div>
          <div className="animation-clips-grid">
            {STANDARD_CLIPS.map((clip) => {
              const hasClip =
                useDummy ||
                availableClips.some((c) => c.toLowerCase() === clip.toLowerCase()) ||
                availableClips.some((c) => c.toLowerCase().includes(clip.toLowerCase()));
              const isActive = activeClip.toLowerCase() === clip.toLowerCase();

              return (
                <button
                  key={clip}
                  className={`clip-btn ${isActive ? "active" : ""} ${!hasClip ? "missing" : ""}`}
                  disabled={!hasClip}
                  onClick={() => {
                    const match = availableClips.find(
                      (c) =>
                        c.toLowerCase() === clip.toLowerCase() ||
                        c.toLowerCase().includes(clip.toLowerCase())
                    );
                    setActiveClip(match || clip);
                  }}
                >
                  <span>{clip}</span>
                  {isActive && <span style={{ fontSize: "0.6rem" }}>●</span>}
                </button>
              );
            })}
          </div>

          {/* Additional Clips Detected in GLB */}
          {!useDummy && availableClips.some((c) => !STANDARD_CLIPS.some((s) => s.toLowerCase() === c.toLowerCase())) && (
            <div className="extra-clips-list">
              <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Clips adicionales en archivo:
              </div>
              {availableClips
                .filter((c) => !STANDARD_CLIPS.some((s) => s.toLowerCase() === c.toLowerCase()))
                .map((clip) => (
                  <button
                    key={clip}
                    className={`clip-btn ${activeClip === clip ? "active" : ""}`}
                    onClick={() => setActiveClip(clip)}
                  >
                    <span>{clip}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Section 3: Playback & Transport Controls */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Reproducción</span>
            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>
              {animTime.toFixed(2)}s / {animDuration.toFixed(2)}s
            </span>
          </div>
          <div className="playback-controls">
            <div className="playback-transport-row">
              <button
                className="play-pause-btn"
                onClick={() => setIsPlaying((p) => !p)}
                title="Pausar / Reanudar (Espacio)"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? "PAUSAR" : "REPRODUCIR"}</span>
              </button>
              <button
                className="asset-btn"
                onClick={() => setAnimSpeed(1.0)}
                title="Restablecer velocidad a 1.0x"
              >
                1.0x
              </button>
            </div>

            {/* Time Scrubber Slider */}
            <div className="slider-group">
              <div className="slider-label-row">
                <span>Scrubber de tiempo</span>
                <span className="val">{animTime.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                className="character-lab-slider"
                min={0}
                max={animDuration || 1}
                step={0.01}
                value={animTime}
                onChange={(e) => {
                  setIsPlaying(false);
                  setAnimTime(parseFloat(e.target.value));
                }}
              />
            </div>

            {/* Animation Speed Slider */}
            <div className="slider-group">
              <div className="slider-label-row">
                <span>Velocidad de Animación</span>
                <span className="val">{animSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                className="character-lab-slider"
                min={0.1}
                max={2.0}
                step={0.05}
                value={animSpeed}
                onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Right Panel: Grounding QA, Transforms & Telemetry */}
      <div className="character-lab-panel character-lab-panel-right">
        {/* Section 1: Grounding QA & foot contact */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Grounding QA (Pies / Suelo)</span>
            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>Y = 0</span>
          </div>

          <div className={`grounding-status-card ${groundingStateClass}`}>
            <div className="grounding-tag-row">
              <span className="grounding-tag">
                {isGrounded && <CheckCircle2 size={15} />}
                {isFloating && <AlertTriangle size={15} />}
                {isSinking && <AlertTriangle size={15} />}
                {isGrounded && "GROUNDED (Pies en suelo)"}
                {isFloating && "FLOATING (Pies flotando)"}
                {isSinking && "SINKING (Pies hundidos)"}
              </span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                {telemetry.feetMinY > 0 ? `+${telemetry.feetMinY.toFixed(3)}m` : `${telemetry.feetMinY.toFixed(3)}m`}
              </span>
            </div>

            <div className="grounding-measurements">
              <div>
                <span>Distancia al suelo: </span>
                <strong>
                  {Math.abs(telemetry.feetMinY * 100).toFixed(1)} cm
                </strong>
              </div>
              <div>
                <span>feetMinY: </span>
                <strong>{telemetry.feetMinY.toFixed(3)} m</strong>
              </div>
            </div>

            <button
              className="auto-ground-btn"
              onClick={handleAutoGround}
              title="Ajustar Visual Y Offset para alinear los pies exactamente con Y=0"
            >
              <Layers size={13} /> Snap to Ground (Compensar Offset)
            </button>
          </div>

          {/* Visual Y Offset slider */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span>Visual Y Offset (Temporal)</span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span className="val">
                  {visualYOffset > 0 ? `+${visualYOffset.toFixed(2)}m` : `${visualYOffset.toFixed(2)}m`}
                </span>
                <button
                  className="rot-btn"
                  onClick={() => setVisualYOffset(0)}
                  title="Restablecer Y Offset a 0"
                >
                  0
                </button>
              </div>
            </div>
            <input
              type="range"
              className="character-lab-slider"
              min={-1.5}
              max={1.5}
              step={0.01}
              value={visualYOffset}
              onChange={(e) => setVisualYOffset(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Section 2: Model Transforms (Scale & Rotation) */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Transformaciones de Prueba</span>
          </div>

          {/* Scale Slider */}
          <div className="slider-group" style={{ marginBottom: "0.6rem" }}>
            <div className="slider-label-row">
              <span>Escala del Modelo</span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span className="val">{modelScale.toFixed(2)}x</span>
                <button
                  className="rot-btn"
                  onClick={() => setModelScale(1.0)}
                  title="Restablecer escala a 1.0x"
                >
                  1.0x
                </button>
              </div>
            </div>
            <input
              type="range"
              className="character-lab-slider"
              min={0.2}
              max={2.5}
              step={0.05}
              value={modelScale}
              onChange={(e) => setModelScale(parseFloat(e.target.value))}
            />
          </div>

          {/* Rotation Slider & Presets */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span>Rotación Yaw (Y)</span>
              <div className="rot-btn-group">
                <button className="rot-btn" onClick={() => setRotationY(0)}>0°</button>
                <button className="rot-btn" onClick={() => setRotationY(90)}>90°</button>
                <button className="rot-btn" onClick={() => setRotationY(180)}>180°</button>
                <button className="rot-btn" onClick={() => setRotationY(270)}>270°</button>
              </div>
            </div>
            <input
              type="range"
              className="character-lab-slider"
              min={0}
              max={360}
              step={1}
              value={rotationY}
              onChange={(e) => setRotationY(parseInt(e.target.value, 10))}
            />
            <div style={{ marginTop: "4px" }}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                />
                <span>Auto-rotar 360° continuo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Visual QA Helpers Toggles */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Ayudas Visuales</span>
          </div>
          <div className="toggles-grid">
            <label className="toggle-label" title="Rejilla métrica sobre el plano Y=0 (G)">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span>Grid Y=0 [G]</span>
            </label>
            <label className="toggle-label" title="Gizmo de ejes XYZ en el origen [0,0,0] (O)">
              <input
                type="checkbox"
                checked={showOrigin}
                onChange={(e) => setShowOrigin(e.target.checked)}
              />
              <span>Root Origin [O]</span>
            </label>
            <label className="toggle-label" title="Caja contenedora de malla (B)">
              <input
                type="checkbox"
                checked={showBoundingBox}
                onChange={(e) => setShowBoundingBox(e.target.checked)}
              />
              <span>Bounding Box [B]</span>
            </label>
            <label className="toggle-label" title="Línea vertical de cota al suelo">
              <input
                type="checkbox"
                checked={showGroundingLine}
                onChange={(e) => setShowGroundingLine(e.target.checked)}
              />
              <span>Línea Suelo Y=0</span>
            </label>
            <label className="toggle-label" title="Sombras de contacto bajo el modelo">
              <input
                type="checkbox"
                checked={showShadows}
                onChange={(e) => setShowShadows(e.target.checked)}
              />
              <span>Contact Shadows</span>
            </label>
          </div>
        </div>

        {/* Section 4: Live Telemetry */}
        <div className="panel-section">
          <div className="panel-section-title">
            <span>Telemetría de Modelo</span>
            <span className="count-pill">{activeClip}</span>
          </div>
          <div className="telemetry-grid">
            <div className="telemetry-row">
              <span className="k">Dimensiones (W × H × D)</span>
              <span className="v">
                {telemetry.width}m × {telemetry.height}m × {telemetry.depth}m
              </span>
            </div>
            <div className="telemetry-row">
              <span className="k">Rango Y (min / max)</span>
              <span className="v">
                {telemetry.minY}m / {telemetry.maxY}m
              </span>
            </div>
            <div className="telemetry-row">
              <span className="k">Meshes en Jerarquía</span>
              <span className="v">{telemetry.meshCount} meshes</span>
            </div>
            <div className="telemetry-row">
              <span className="k">Clips de Animación</span>
              <span className="v">{telemetry.clipCount} clips</span>
            </div>
            <div className="telemetry-row">
              <span className="k">Vértices</span>
              <span className="v">{telemetry.vertexCount.toLocaleString()}</span>
            </div>
            <div className="telemetry-row">
              <span className="k">Triángulos</span>
              <span className="v">{telemetry.triangleCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Bottom Quick Bar */}
      <footer className="character-lab-bottom-bar">
        <div className="bottom-bar-segment">
          <span className="hint">Clip:</span>
          <strong style={{ color: "#00e5ff" }}>{activeClip}</strong>
        </div>
        <div className="bottom-bar-segment">
          <span className="hint">Tiempo:</span>
          <span>{animTime.toFixed(2)}s / {animDuration.toFixed(2)}s</span>
        </div>
        <div className="bottom-bar-segment">
          <span className="hint">Grounding:</span>
          <span style={{
            color: isGrounded ? "#34d399" : isFloating ? "#fbbf24" : "#f87171",
            fontWeight: 700,
          }}>
            {isGrounded ? "GROUNDED" : isFloating ? "FLOATING" : "SINKING"} ({telemetry.feetMinY > 0 ? `+${telemetry.feetMinY.toFixed(3)}m` : `${telemetry.feetMinY.toFixed(3)}m`})
          </span>
        </div>
        <div className="bottom-bar-segment">
          <span className="hint">Cámara:</span>
          <span style={{ textTransform: "uppercase", color: "#a5f3fc" }}>{cameraPreset}</span>
        </div>
      </footer>
    </div>
  );
};
