/**
 * Three.js renderer for the {@link TopologyScene} (issue #22, Phase 2).
 *
 * Consumes the renderer-agnostic scene produced by `buildScene` and renders its
 * elements as swept solids — β-strands → ribbons, α-helices → cylinders, coil →
 * tubes — with a morph parameter `t ∈ [0,1]` that rolls the flat 2-D layout up
 * into the real 3-D structure via an N→C travelling wavefront, and a camera that
 * eases from dead-on near-orthographic (matching the SVG diagram) to a ~35 mm
 * perspective.
 *
 * This module imports only `three` and the scene types — nothing from the SVG
 * component — so it lands in its own lazily-loaded chunk and never weighs down
 * the core bundle. See `docs/3d-renderer-plan.md` §5.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneElement, TopologyScene } from '../scene/types.js';

const COLOURS: Record<SceneElement['type'], number> = {
  helix: 0x6e8db6,
  strand: 0x6ea76d,
  loop: 0x888888,
};
const CONTACT_COLOUR = 0xc98a3b;

/** 3-D ribbon body half-width (Å) reached at the fully-rolled end (~1 nm wide). */
const RIBBON_3D_HALF = 5;
const WAVEFRONT = 0.35;

interface ElementRender {
  type: SceneElement['type'];
  arrow: boolean;
  faded: boolean;
  flat: THREE.Vector3[];
  solid: THREE.Vector3[];
  /** Solid-frame radial face direction per sample (barrels), else null. */
  solidFace: THREE.Vector3[] | null;
  arcFrac: number[];
  /** SVG-matching ribbon half-width at the flat end (Å). */
  flatHalfW: number;
  ring: number;
  thickness: number;
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export class TopologyView3D {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly group = new THREE.Group();
  private membrane: THREE.Mesh | null = null;
  private contacts: THREE.LineSegments | null = null;
  private contactPairs: {
    flat: [THREE.Vector3, THREE.Vector3];
    solid: [THREE.Vector3, THREE.Vector3];
    arcFrac: number;
  }[] = [];
  private elements: ElementRender[] = [];
  private topo: TopologyScene | null = null;
  private t = 0;
  private membraneHalf = 15;
  private sceneRadius = 60;
  private raf = 0;
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene.background = new THREE.Color(0xf4f6f8);
    this.scene.add(this.group);

    this.camera = new THREE.PerspectiveCamera(8, 1, 0.1, 200000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.enabled = false;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(1, 1.4, 1);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-1, -0.5, -0.8);
    this.scene.add(fill);

    container.appendChild(this.renderer.domElement);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.animate();
  }

  /**
   * Fit the renderer/camera to the container's current size. Public so the host
   * can call it after revealing a previously-hidden stage (a renderer built while
   * the container was `display:none` would otherwise be sized 0×0).
   */
  resize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight || Math.round(w * 0.6);
    if (w === 0) return; // container not laid out yet; caller re-fits when shown
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h || 1;
    this.camera.updateProjectionMatrix();
  };

  /** Load a scene (replacing any previous). Centres the structure at the origin. */
  setScene(topo: TopologyScene): void {
    for (const el of this.elements) {
      this.group.remove(el.mesh);
      el.geometry.dispose();
      (el.mesh.material as THREE.Material).dispose();
    }
    this.elements = [];
    if (this.membrane) {
      this.group.remove(this.membrane);
      this.membrane.geometry.dispose();
    }
    if (this.contacts) {
      this.group.remove(this.contacts);
      this.contacts.geometry.dispose();
    }

    this.topo = topo;
    this.membraneHalf = topo.membrane.half;

    // Centre on the real-coord centroid (xy) and the arc midpoint.
    let cx = 0;
    let cy = 0;
    let n = 0;
    let minArc = Infinity;
    let maxArc = -Infinity;
    for (const el of topo.elements) {
      for (const s of el.samples) {
        cx += s.pos3d.x;
        cy += s.pos3d.y;
        n++;
        if (s.arc < minArc) minArc = s.arc;
        if (s.arc > maxArc) maxArc = s.arc;
      }
    }
    cx /= n || 1;
    cy /= n || 1;
    const arcMid = Number.isFinite(minArc) ? (minArc + maxArc) / 2 : 0;
    const barrel = topo.kind === 'barrel' || topo.kind === 'assembly';

    // Map a scene sample → flat and solid view positions. Membrane normal (real
    // z / depth) is the vertical (view Y) in both, so the bilayer stays level.
    const flatOf = (arc: number, z: number): THREE.Vector3 => new THREE.Vector3(arc - arcMid, z, 0);
    const solidOf = (p: { x: number; y: number; z: number }): THREE.Vector3 =>
      new THREE.Vector3(p.x - cx, p.z, p.y - cy);

    for (const el of topo.elements) {
      this.elements.push(this.buildElement(el, topo, flatOf, solidOf, arcMid, barrel));
    }

    // Contacts as morphing line segments.
    this.contactPairs = topo.contacts.map((c) => ({
      flat: [flatOf(c.a.arc, c.a.z), flatOf(c.b.arc, c.b.z)],
      solid: [solidOf(c.a.pos3d), solidOf(c.b.pos3d)],
      arcFrac: (0.5 * (c.a.arc + c.b.arc)) / (topo.arcSpan || 1),
    }));
    if (this.contactPairs.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(this.contactPairs.length * 6), 3),
      );
      this.contacts = new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({ color: CONTACT_COLOUR, transparent: true, opacity: 0.6 }),
      );
      this.group.add(this.contacts);
    } else {
      this.contacts = null;
    }

    this.buildMembrane(topo, arcMid);
    this.updateMorph();
  }

  private buildElement(
    el: SceneElement,
    topo: TopologyScene,
    flatOf: (arc: number, z: number) => THREE.Vector3,
    solidOf: (p: { x: number; y: number; z: number }) => THREE.Vector3,
    _arcMid: number,
    barrel: boolean,
  ): ElementRender {
    const flat = el.samples.map((s) => flatOf(s.arc, s.z));
    const solid = el.samples.map((s) => solidOf(s.pos3d));
    const arcFrac = el.samples.map((s) => s.arc / (topo.arcSpan || 1));

    // Strand ribbons on a barrel lie flat on the wall — their face points
    // radially out of the cylinder axis (view Y) at the solid position.
    let solidFace: THREE.Vector3[] | null = null;
    if (el.type === 'strand' && barrel) {
      solidFace = solid.map((p) => {
        const f = new THREE.Vector3(p.x, 0, p.z);
        return f.lengthSq() < 1e-6 ? new THREE.Vector3(0, 0, 1) : f.normalize();
      });
    }

    const ring = el.type === 'strand' ? 4 : 10;
    const thickness =
      el.type === 'strand'
        ? topo.style.ribbonThickness / 2
        : el.type === 'helix'
          ? topo.style.helixRadius
          : topo.style.loopRadius;

    const geometry = new THREE.BufferGeometry();
    const segs = el.samples.length - 1;
    const idx: number[] = [];
    for (let i = 0; i < segs; i++) {
      for (let k = 0; k < ring; k++) {
        const a = i * ring + k;
        const b = i * ring + ((k + 1) % ring);
        const c = (i + 1) * ring + k;
        const d = (i + 1) * ring + ((k + 1) % ring);
        idx.push(a, c, b, b, c, d);
      }
    }
    geometry.setIndex(idx);
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(el.samples.length * ring * 3), 3),
    );

    const material = new THREE.MeshStandardMaterial({
      color: COLOURS[el.type],
      roughness: 0.55,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: el.faded,
      opacity: el.faded ? 0.32 : 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);

    return {
      type: el.type,
      arrow: el.type === 'strand',
      faded: el.faded,
      flat,
      solid,
      solidFace,
      arcFrac,
      flatHalfW: topo.style.ribbonHalfWidth,
      ring,
      thickness,
      geometry,
      mesh,
    };
  }

  private buildMembrane(topo: TopologyScene, arcMid: number): void {
    const halfArc = Math.max(topo.arcSpan / 2, 20);
    const w = halfArc * 2.2;
    const depth = Math.max(topo.style.helixRadius * 8, 40);
    const geo = new THREE.BoxGeometry(w, topo.membrane.half * 2, depth);
    geo.translate(topo.arcSpan / 2 - arcMid, 0, 0); // flat extent is centred on arcMid
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcfd6dd,
      transparent: true,
      opacity: 0.22,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    this.membrane = new THREE.Mesh(geo, mat);
    this.group.add(this.membrane);
  }

  setT(t: number): void {
    this.t = Math.max(0, Math.min(1, t));
    this.updateMorph();
  }

  get morph(): number {
    return this.t;
  }

  /** Recompute morphed centrelines + per-sample faces and rebuild geometry. */
  private updateMorph(): void {
    const e = smooth(this.t);
    for (const el of this.elements) {
      const pts: THREE.Vector3[] = [];
      const faces: THREE.Vector3[] = [];
      for (let i = 0; i < el.flat.length; i++) {
        const local = smooth(
          THREE.MathUtils.clamp((this.t * (1 + WAVEFRONT) - el.arcFrac[i]) / WAVEFRONT, 0, 1),
        );
        pts.push(new THREE.Vector3().lerpVectors(el.flat[i], el.solid[i], local));
        // Ribbon face: camera-facing (+Z) flat so the strand arrow faces us;
        // rotates to the barrel-wall radial as it rolls.
        const flatFace = new THREE.Vector3(0, 0, 1);
        const solidFace = el.solidFace ? el.solidFace[i] : flatFace;
        faces.push(new THREE.Vector3().lerpVectors(flatFace, solidFace, local).normalize());
      }
      // Ribbon width grows from the SVG width (flat) to ~1 nm (3-D).
      const halfW = el.type === 'strand' ? lerp(el.flatHalfW, RIBBON_3D_HALF, e) : el.thickness;
      this.writeSweep(el, pts, faces, halfW);
    }
    this.updateContacts();

    let r = this.membraneHalf;
    for (const el of this.elements) {
      const bs = el.geometry.boundingSphere;
      if (bs) r = Math.max(r, bs.center.length() + bs.radius);
    }
    this.sceneRadius = r;
  }

  private updateContacts(): void {
    if (!this.contacts) return;
    const pos = this.contacts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < this.contactPairs.length; i++) {
      const c = this.contactPairs[i];
      const local = smooth(
        THREE.MathUtils.clamp((this.t * (1 + WAVEFRONT) - c.arcFrac) / WAVEFRONT, 0, 1),
      );
      for (let e = 0; e < 2; e++) {
        tmp.lerpVectors(c.flat[e], c.solid[e], local);
        arr[i * 6 + e * 3] = tmp.x;
        arr[i * 6 + e * 3 + 1] = tmp.y;
        arr[i * 6 + e * 3 + 2] = tmp.z;
      }
    }
    pos.needsUpdate = true;
  }

  /** Sweep the element's cross-section along the morphed centreline. */
  private writeSweep(
    el: ElementRender,
    pts: THREE.Vector3[],
    faces: THREE.Vector3[],
    halfW: number,
  ): void {
    const pos = el.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const tangent = new THREE.Vector3();
    const bin = new THREE.Vector3();
    const nor = new THREE.Vector3();
    const n = pts.length;
    // Arrowhead taper (ribbon): widen then collapse over the last stretch.
    const totalLen = polylineLength(pts);

    for (let i = 0; i < n; i++) {
      if (i === 0) tangent.subVectors(pts[1], pts[0]);
      else if (i === n - 1) tangent.subVectors(pts[i], pts[i - 1]);
      else tangent.subVectors(pts[i + 1], pts[i - 1]);
      tangent.normalize();
      bin.crossVectors(tangent, faces[i]);
      if (bin.lengthSq() < 1e-6) bin.crossVectors(tangent, new THREE.Vector3(0, 1, 0));
      if (bin.lengthSq() < 1e-6) bin.set(1, 0, 0);
      bin.normalize();
      nor.crossVectors(bin, tangent).normalize();

      let w = halfW;
      if (el.arrow) {
        const arrowLen = Math.min(9, totalLen * 0.4);
        const dToTip = ((n - 1 - i) / (n - 1)) * totalLen;
        w = dToTip > arrowLen ? halfW : (halfW * 1.7 * dToTip) / arrowLen;
      }
      const base = i * el.ring * 3;
      if (el.ring === 4) {
        const corners: [number, number][] = [
          [w, el.thickness],
          [w, -el.thickness],
          [-w, -el.thickness],
          [-w, el.thickness],
        ];
        for (let k = 0; k < 4; k++) {
          const [cw, cd] = corners[k];
          arr[base + k * 3] = pts[i].x + bin.x * cw + nor.x * cd;
          arr[base + k * 3 + 1] = pts[i].y + bin.y * cw + nor.y * cd;
          arr[base + k * 3 + 2] = pts[i].z + bin.z * cw + nor.z * cd;
        }
      } else {
        for (let k = 0; k < el.ring; k++) {
          const a = (k / el.ring) * Math.PI * 2;
          const cw = Math.cos(a) * w;
          const cd = Math.sin(a) * w;
          arr[base + k * 3] = pts[i].x + bin.x * cw + nor.x * cd;
          arr[base + k * 3 + 1] = pts[i].y + bin.y * cw + nor.y * cd;
          arr[base + k * 3 + 2] = pts[i].z + bin.z * cw + nor.z * cd;
        }
      }
    }
    pos.needsUpdate = true;
    el.geometry.computeVertexNormals();
    el.geometry.computeBoundingSphere();
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    if (this.t >= 1) {
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
      if (!this.controls.enabled) {
        const fovR = THREE.MathUtils.degToRad(50);
        const dist = (this.sceneRadius / Math.sin(fovR / 2)) * 1.06;
        const az = THREE.MathUtils.degToRad(30);
        const el = THREE.MathUtils.degToRad(14);
        this.camera.position.set(
          dist * Math.sin(az) * Math.cos(el),
          dist * Math.sin(el),
          dist * Math.cos(az) * Math.cos(el),
        );
        this.camera.lookAt(0, 0, 0);
        this.controls.enabled = true;
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.controls.enabled = false;
    const e = smooth(this.t);
    const fov = lerp(2, 50, e);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    const fovR = THREE.MathUtils.degToRad(fov);
    const dist = (this.sceneRadius / Math.sin(fovR / 2)) * 1.06;
    const az = THREE.MathUtils.degToRad(lerp(0, 30, e));
    const el = THREE.MathUtils.degToRad(lerp(0, 14, e));
    this.camera.position.set(
      dist * Math.sin(az) * Math.cos(el),
      dist * Math.sin(el),
      dist * Math.cos(az) * Math.cos(el),
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

function polylineLength(pts: THREE.Vector3[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  return L;
}
