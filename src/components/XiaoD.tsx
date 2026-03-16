import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

export type RobotMode = 'idle' | 'thinking' | 'talking' | 'smiling';

// ─── 主角色 ───────────────────────────────────────────────────────────
function XiaoDCharacter({ mode }: { mode: RobotMode }) {
  const headRef = useRef<THREE.Group>(null!);
  const armL    = useRef<THREE.Mesh>(null!);
  const armR    = useRef<THREE.Mesh>(null!);
  const legL    = useRef<THREE.Mesh>(null!);
  const legR    = useRef<THREE.Mesh>(null!);
  const eyeL    = useRef<THREE.Mesh>(null!);
  const eyeR    = useRef<THREE.Mesh>(null!);

  const rotationAccumulator = useRef(0);
  const [blink, setBlink] = useState(false);
  
  useEffect(() => {
    const id = setInterval(
      () => { setBlink(true); setTimeout(() => setBlink(false), 110); },
      4000 + Math.random() * 2500,
    );
    return () => clearInterval(id);
  }, []);

  useFrame(({ clock }, delta) => {
    const t  = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);
    const lp = 5 * dt;
    if (!headRef.current) return;

    // 旋轉累加與平滑切換
    if (mode === 'thinking') {
      rotationAccumulator.current += delta * 2.8;
    } else {
      const targetBase = Math.round(rotationAccumulator.current / (Math.PI * 2)) * (Math.PI * 2);
      rotationAccumulator.current = THREE.MathUtils.lerp(rotationAccumulator.current, targetBase, lp);
    }

    // 头部動畫
    let ry = rotationAccumulator.current + (mode !== 'thinking' ? Math.sin(t / 2.5) * 0.12 : 0);
    let rz = 0;
    let py = Math.sin(t * 1.5) * 0.04;
    
    if (mode === 'thinking') {
      py = Math.sin(t * 2.5) * 0.15;
      rz = Math.sin(t * 1.2) * 0.1;
    } else if (mode === 'talking') {
      py = Math.sin(t * 11) * 0.05;
      ry += Math.sin(t * 5) * 0.07;
    } else if (mode === 'smiling') {
      py = Math.sin(t * 4) * 0.03;
    }
    
    headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, ry, lp * 1.5);
    headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, rz, lp);
    headRef.current.position.y = THREE.MathUtils.lerp(headRef.current.position.y, py, lp);

    // 豆豆眼動畫
    const ledColor = mode==='thinking' ? '#ffcc00' : mode==='smiling' ? '#80ffcc' : '#ffffff';
    [eyeL.current, eyeR.current].forEach((eye) => {
      if (!eye) return;
      let sx = 1, sy = 1;
      let ty = 0.06;

      if (blink && mode !== 'idle') {
        sy = 0.07;
      } else if (mode === 'thinking') {
        sy = 0.05;
      } else if (mode === 'smiling') {
        sx = 1.1; sy = 0.7; ty = 0.05;
      } else if (mode === 'talking') {
        sy = 0.82 + Math.abs(Math.sin(t * 11)) * 0.22;
      }

      eye.scale.x = THREE.MathUtils.lerp(eye.scale.x, sx, lp);
      eye.scale.y = THREE.MathUtils.lerp(eye.scale.y, sy, lp);
      eye.position.y = THREE.MathUtils.lerp(eye.position.y, ty, lp);
      
      const mat = eye.material as THREE.MeshStandardMaterial;
      mat.color.set(ledColor);
      mat.emissive.set(ledColor);
    });

    // 四肢
    const lm = (m: THREE.Mesh|null, px:number, py_:number, pz:number, rz_:number) => {
      if (!m) return;
      m.position.x = THREE.MathUtils.lerp(m.position.x, px, lp);
      m.position.y = THREE.MathUtils.lerp(m.position.y, py_, lp);
      m.position.z = THREE.MathUtils.lerp(m.position.z, pz, lp);
      m.rotation.z = THREE.MathUtils.lerp(m.rotation.z, rz_, lp);
    };
    const sw = Math.sin(t * 1.8);
    if (mode === 'idle') {
      lm(armL.current,-0.58,-0.22,0.08, sw*0.18-0.3);
      lm(armR.current, 0.58,-0.22,0.08,-sw*0.18+0.3);
      lm(legL.current,-0.28,-0.62,0, sw*0.08);
      lm(legR.current, 0.28,-0.62,0,-sw*0.08);
    } else if (mode === 'thinking') {
      lm(armL.current,-0.42,-0.05,0.3, 0.65);
      lm(armR.current, 0.55,-0.25,0.08, 0.2);
      lm(legL.current,-0.28,-0.62,0, 0.1);
      lm(legR.current, 0.28,-0.62,0,-0.1);
    } else if (mode === 'talking') {
      lm(armL.current,-0.60,-0.15,0.2, Math.sin(t*11)*0.35-0.25);
      lm(armR.current, 0.60,-0.15,0.2,-Math.sin(t*11)*0.35+0.25);
      lm(legL.current,-0.28,-0.6, Math.sin(t*11)*0.06, 0);
      lm(legR.current, 0.28,-0.6,-Math.sin(t*11)*0.06, 0);
    } else if (mode === 'smiling') {
      lm(armL.current,-0.65,-0.08,0.22, 0.62);
      lm(armR.current, 0.65,-0.08,0.22,-0.62);
      lm(legL.current,-0.30,-0.68,0,-0.07);
      lm(legR.current, 0.30,-0.68,0, 0.07);
    }
  });

  const R = 0.62;
  const currentLedColor = mode==='thinking' ? '#ffcc00' : mode==='smiling' ? '#80ffcc' : '#ffffff';

  return (
    <group>
      <Float speed={1.5} rotationIntensity={0.06} floatIntensity={0.55}>
        <group ref={headRef}>
          {/* ── 白色科技頭球 ── */}
          <mesh>
            <sphereGeometry args={[R, 56, 56]} />
            <meshStandardMaterial color="#edf5ff" roughness={0.18} metalness={0.1} />
          </mesh>

          {/* ── 屏幕組件（對齊正前方）── */}
          <group rotation={[0, Math.PI / 2, 0]} position={[0, 0.03, 0]}>
            {/* 屏幕主體 */}
            <mesh>
              <sphereGeometry args={[R * 1.025, 48, 48, -0.62, 1.24, 1.15, 0.85]} />
              <meshStandardMaterial color="#050d1a" roughness={0.95} metalness={0} />
            </mesh>
            {/* 屏幕邊框 */}
            <mesh>
              <sphereGeometry args={[R * 1.021, 48, 48, -0.66, 1.32, 1.1, 0.95]} />
              <meshStandardMaterial color="#2a7ab8" emissive="#1a5088" emissiveIntensity={0.7} roughness={0.15} metalness={0.4} />
            </mesh>

            {/* ── 眼睛（白色矩形風格，但使用球面防止穿模）── */}
            {/* 左眼 */}
            <group rotation={[0, -0.22, 0]}>
              <mesh ref={eyeL} position={[0, 0.06, 0]}>
                <sphereGeometry args={[R * 1.04, 24, 24, -0.12, 0.24, 1.45, 0.24]} />
                <meshStandardMaterial color={currentLedColor} emissive={currentLedColor} emissiveIntensity={2.8} roughness={0.1} />
              </mesh>
            </group>

            {/* 右眼 */}
            <group rotation={[0, 0.22, 0]}>
              <mesh ref={eyeR} position={[0, 0.06, 0]}>
                <sphereGeometry args={[R * 1.04, 24, 24, -0.12, 0.24, 1.45, 0.24]} />
                <meshStandardMaterial color={currentLedColor} emissive={currentLedColor} emissiveIntensity={2.8} roughness={0.1} />
              </mesh>
            </group>
          </group>

          {/* 天線 */}
          {[ -0.58, 0.58 ].map((x, i) => (
            <group key={i} position={[x, 0.18, 0]} rotation={[-0.26, 0, 0]}>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.038, 0.045, 0.08, 10]} />
                <meshStandardMaterial color="#7ab8e0" roughness={0.15} metalness={0.85} />
              </mesh>
              <mesh position={[0, 0.32, 0]}>
                <cylinderGeometry args={[0.022, 0.028, 0.50, 10]} />
                <meshStandardMaterial color="#c0dff8" roughness={0.1} metalness={0.9} />
              </mesh>
              <mesh position={[0, 0.60, 0]}>
                <sphereGeometry args={[0.048, 16, 16]} />
                <meshStandardMaterial color="#38beff" emissive="#38beff" emissiveIntensity={2} />
              </mesh>
            </group>
          ))}
          {/* 四肢與關節（移動到 headRef 內部以保持動作一致） */}
          <mesh ref={armL} position={[-0.58, -0.22, 0.08]}>
            <capsuleGeometry args={[0.11, 0.22, 6, 14]} />
            <meshStandardMaterial color="#c5e2f5" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh ref={armR} position={[0.58, -0.22, 0.08]}>
            <capsuleGeometry args={[0.11, 0.22, 6, 14]} />
            <meshStandardMaterial color="#c5e2f5" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh ref={legL} position={[-0.28, -0.62, 0]}>
            <capsuleGeometry args={[0.10, 0.18, 6, 14]} />
            <meshStandardMaterial color="#c5e2f5" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh ref={legR} position={[0.28, -0.62, 0]}>
            <capsuleGeometry args={[0.10, 0.18, 6, 14]} />
            <meshStandardMaterial color="#c5e2f5" roughness={0.2} metalness={0.1} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

const XiaoD = ({ mode = 'idle', className = '' }: { mode?: RobotMode, className?: string }) => (
  <div className={`relative w-full h-full ${className}`}>
    <div className="absolute inset-0 w-full h-full">
      <Canvas camera={{ position: [0, 0, 2.8], fov: 52 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.3} color="#f0f8ff" />
          <directionalLight position={[2, 4, 5]} intensity={1.8} color="#ffffff" />
          <Environment preset="city" />
          <XiaoDCharacter mode={mode} />
        </Suspense>
      </Canvas>
    </div>
  </div>
);

export default XiaoD;
