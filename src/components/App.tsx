import React, { Suspense, useState, memo, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera, Stats, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { Portal } from './Portal';

type RenderMode = 'naive' | 'instanced';

export const App = () => {
    const [mode, setMode] = useState<RenderMode>('naive');
    const [count, setCount] = useState<number>(10);
    return (
        <>
            <select
                style={{ marginLeft: '100px' }}
                onChange={event => setMode(event.target.value as RenderMode)}
                value={mode}
            >
                <option value="naive">Naive</option>
                <option value="instanced">Instanced</option>
            </select>
            <label>
                <input
                    type="range"
                    min="0"
                    max="500"
                    value={count}
                    onChange={event => setCount(+event.target.value)}
                />
                {count}x{count}={count * count}
            </label>
            <Canvas style={{ width: '100%', height: '100%' }}>
                <DebugInfo />
                <Scene mode={mode} count={count} />
            </Canvas>
        </>
    );
};

const Scene: React.FC<{ mode: RenderMode; count: number }> = ({ mode, count }) => {
    return (
        <>
            <PerspectiveCamera near={0.1} far={10000} fov={Math.PI / 2} />

            <OrbitControls
                mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE,
                }}
                autoRotate
            />

            <Stats showPanel={0} />

            <Objects mode={mode} count={count} />
        </>
    );
};

const Objects: React.FC<{ mode: RenderMode; count: number }> = memo(({ mode, count }) => {
    const dim = count;
    const step = 5;
    const points = useMemo<THREE.Vector3[]>(() => {
        const range = [...Array(dim)].map((_, i) => (i - dim / 2) * step);
        return range.flatMap(x => range.map(z => new THREE.Vector3(x, 0, z)));
    }, [dim]);

    const path = '/models/cooler_uv.fbx';

    return (
        <>
            <ambientLight />

            <gridHelper position={[-step / 2, 0, -step / 2]} args={[(dim + 1) * step, dim]} />

            {mode === 'naive' ? <ObjectsNaive points={points} path={path} /> : null}
            {mode === 'instanced' ? <ObjectsInstanced points={points} path={path} /> : null}
        </>
    );
});

const ObjectsNaive: React.FC<{ points: THREE.Vector3[]; path: string }> = ({ points, path }) => {
    return (
        <>
            {points.map((point, i) => (
                <Suspense fallback={null} key={i}>
                    <ObjectNaiveInner point={point} path={path} />
                </Suspense>
            ))}
        </>
    );
};
const ObjectNaiveInner: React.FC<{ point: THREE.Vector3; path: string }> = memo(
    ({ point, path }) => {
        const model = useFBX(path).clone();

        return <primitive object={model} position={point} />;
    }
);

const ObjectsInstanced: React.FC<{ points: THREE.Vector3[]; path: string }> = ({
    points,
    path,
}) => {
    return (
        <Suspense fallback={null}>
            <ObjectsInstancedInner points={points} path={path} />
        </Suspense>
    );
};
const ObjectsInstancedInner: React.FC<{ points: THREE.Vector3[]; path: string }> = ({
    points,
    path,
}) => {
    const model = useFBX(path);
    const meshRef = useRef<THREE.InstancedMesh>();

    const mesh = model.children[0] as THREE.Mesh;

    const count = useRef(points.length);
    if (points.length > count.current) {
        count.current = points.length;
    }

    useEffect(() => {
        const tempObject = new THREE.Object3D();

        points.forEach((point, i) => {
            tempObject.position.copy(point);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
        });

        // remove extra
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        for (let i = points.length; i < count.current; i++) {
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
        }

        meshRef.current!.instanceMatrix.needsUpdate = true;
    }, [points]);

    return <instancedMesh ref={meshRef} args={[mesh.geometry, mesh.material, count.current]} />;
};

const DebugInfo = memo(() => {
    const gl = useThree(state => state.gl);
    const [, forceUpdate] = useState({});

    useFrame(() => {
        forceUpdate({});
    });

    return (
        <Html>
            <Portal id="debug">
                <span
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'white',
                    }}
                >
                    <span>Draw Calls: {gl.info.render.calls}</span>{' '}
                    <span>Lines: {gl.info.render.lines}</span>{' '}
                    <span>Points: {gl.info.render.points}</span>{' '}
                    <span>Triangles: {gl.info.render.triangles}</span>{' '}
                    <span>Frame: {gl.info.render.frame}</span>{' '}
                </span>
            </Portal>
        </Html>
    );
});
