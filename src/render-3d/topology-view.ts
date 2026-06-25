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
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { SceneElement, TopologyScene } from '../scene/types.js';
import { curlXZ, ringRadius } from './unroll-map.js';

const COLOURS: Record<SceneElement['type'], number> = {
  helix: 0x6e8db6,
  strand: 0x6ea76d,
  loop: 0x888888,
};

/** SVG loop stroke half-width in Å (stroke 1.8 px ÷ arcPxPerA 2.5 ÷ 2). */
const LOOP_FLAT_HALF = 0.36;
/** 3-D ribbon body half-width (Å) reached at the fully-rolled end. */
const RIBBON_3D_HALF = 1.3;
/** Width of the N→C travelling roll front (smaller = sharper rolling edge). */
const WAVEFRONT = 0.3;
/** Outline colour for the post-processing silhouette pass. */
const OUTLINE_COLOUR = 0x1a1f24;
/** Layer the membrane renders on (excluded from the AO camera). */
const MEMBRANE_LAYER = 1;
/** Tube cross-section segments (helix/coil) — higher is smoother. */
const TUBE_RING = 16;
/** Default 3-D camera framing angles. */
const VIEW_AZ = Math.PI / 6; // 30°
const VIEW_EL = (14 * Math.PI) / 180;
/** Camera field of view at the flat (≈orthographic) and rolled ends. */
const FOV_FLAT = 2;
const FOV_3D = 50;

interface ElementRender {
  type: SceneElement['type'];
  arrow: boolean;
  faded: boolean;
  flat: THREE.Vector3[];
  solid: THREE.Vector3[];
  /** Solid-frame radial face direction per sample (barrels), else null. */
  solidFace: THREE.Vector3[] | null;
  arcFrac: number[];
  /** Cross-section half-width/radius at the flat (2-D) and rolled (3-D) ends (Å). */
  flatHalf: number;
  radius3d: number;
  /** Cross-section thickness at the flat and rolled ends (Å). */
  thickFlat: number;
  thick3d: number;
  ring: number;
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
  // Membrane is two opaque flank panels, clipped in world space so the camera-
  // facing half is always cut away (never in front of the protein) and a gap is
  // left around the protein (so it never clips through the middle).
  private membraneL: THREE.Mesh | null = null;
  private membraneR: THREE.Mesh | null = null;
  private readonly clipNear = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  private readonly clipGapL = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  private readonly clipGapR = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  // Post-processing: outlines + ambient occlusion. `aoCamera` shadows the main
  // camera but only sees the protein layer, so the membrane never pollutes the
  // AO G-buffer (GTAO's override material ignores clipping planes).
  private composer: EffectComposer | null = null;
  private gtaoPass: GTAOPass | null = null;
  private outlinePass: OutlinePass | null = null;
  private readonly aoCamera: THREE.PerspectiveCamera;
  private elements: ElementRender[] = [];
  private topo: TopologyScene | null = null;
  private t = 0;
  private membraneHalf = 15;
  private sceneRadius = 60;
  /** Mean cross-section radius (Å) of the rolled structure — drives the curl. */
  private ringR = 12;
  // Extents (Å) for the morphing membrane slab: flat arc half-width, and the
  // rolled structure's half-extent across (X) and in depth (Z).
  private flatHalfWidth = 60;
  private solidHalfX = 20;
  private solidHalfDepth = 20;
  // Camera anchor: the angle/zoom the 3-D end eases to/from. Defaults to the 3/4
  // framing; captured from the user's orbit when rolling back down so the return
  // to the flat orthographic view is smooth from whatever angle they left it.
  private anchorAz = VIEW_AZ;
  private anchorEl = VIEW_EL;
  private anchorDist: number | null = null;
  // Pixels-per-Ångström the SVG diagram draws at. When set, the flat (t=0) camera
  // reproduces that exact scale so the 3-D view overlays the 2-D one on the flip,
  // rather than fitting the bounding sphere (which renders wide barrels tiny).
  private flatPxPerA = 0;
  private raf = 0;
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.localClippingEnabled = true; // world-space membrane cutaway
    this.scene.background = new THREE.Color(0xf4f6f8);
    this.scene.add(this.group);

    this.camera = new THREE.PerspectiveCamera(8, 1, 0.1, 200000);
    this.camera.layers.enable(MEMBRANE_LAYER); // beauty pass sees protein + membrane
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.enabled = false;
    // AO camera shadows the main camera but only sees the protein layer (0), so
    // the (clip-ignoring) GTAO G-buffer never includes the membrane.
    this.aoCamera = new THREE.PerspectiveCamera(8, 1, 0.1, 200000);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(1, 1.4, 1);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-1, -0.5, -0.8);
    this.scene.add(fill);

    container.appendChild(this.renderer.domElement);
    this.resize();
    this.buildComposer();
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
    if (this.composer) {
      const dpr = this.renderer.getPixelRatio();
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
      const pxW = Math.max(1, Math.round(w * dpr));
      const pxH = Math.max(1, Math.round(h * dpr));
      this.gtaoPass?.setSize(pxW, pxH);
      this.outlinePass?.setSize(pxW, pxH);
    }
  };

  /** Load a scene (replacing any previous). Centres the structure at the origin. */
  setScene(topo: TopologyScene): void {
    for (const el of this.elements) {
      this.group.remove(el.mesh);
      el.geometry.dispose();
      (el.mesh.material as THREE.Material).dispose();
    }
    this.elements = [];
    for (const m of [this.membraneL, this.membraneR]) {
      if (!m) continue;
      this.group.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.membraneL = this.membraneR = null;

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

    // Extents for the membrane slab and framing.
    let fhw = 0;
    let shx = 0;
    let shd = 0;
    for (const el of this.elements) {
      for (const v of el.flat) fhw = Math.max(fhw, Math.abs(v.x));
      for (const v of el.solid) {
        shx = Math.max(shx, Math.abs(v.x));
        shd = Math.max(shd, Math.abs(v.z));
      }
    }
    this.flatHalfWidth = fhw;
    this.solidHalfX = shx;
    this.solidHalfDepth = shd;
    // Mean cross-section radius about the axis — the curl bows the rolling paths
    // out to ~this radius so the sheet wraps around the axis instead of through it.
    this.ringR = ringRadius(
      this.elements.flatMap((el) => el.solid.map((v) => ({ x: v.x, z: v.z }))),
    );
    // Fresh scene → reset the camera anchor to the default 3/4 framing.
    this.anchorAz = VIEW_AZ;
    this.anchorEl = VIEW_EL;
    this.anchorDist = null;

    this.buildMembrane();
    this.refreshOutlineSelection();
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

    const ring = el.type === 'strand' ? 4 : TUBE_RING;
    // Cross-section eases from the SVG-matching flat size (so the 3-D view
    // overlays the 2-D diagram at t=0) to the rounded 3-D size at t=1.
    const svgHalf = topo.style.ribbonHalfWidth;
    let flatHalf: number;
    let radius3d: number;
    let thickFlat: number;
    let thick3d: number;
    if (el.type === 'strand') {
      flatHalf = svgHalf;
      radius3d = RIBBON_3D_HALF;
      // Keep the two DoubleSide faces far enough apart that they don't z-fight
      // (0.12 was thin enough to flicker as the frame rotated each morph step).
      thickFlat = 0.35;
      thick3d = topo.style.ribbonThickness / 2;
    } else if (el.type === 'helix') {
      flatHalf = svgHalf;
      radius3d = topo.style.helixRadius;
      thickFlat = svgHalf; // circular tube: thickness tracks the radius
      thick3d = topo.style.helixRadius;
    } else {
      flatHalf = LOOP_FLAT_HALF;
      radius3d = topo.style.loopRadius;
      thickFlat = LOOP_FLAT_HALF;
      thick3d = topo.style.loopRadius;
    }

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
      flatHalf,
      radius3d,
      thickFlat,
      thick3d,
      ring,
      geometry,
      mesh,
    };
  }

  private buildMembrane(): void {
    // Two opaque slab panels on their own layer. World-space clip planes
    // (updated per frame in updateMembraneClip) cut the camera-facing half away
    // and leave a gap around the protein, so the slab can never sit in front of —
    // or clip through — the structure. Opaque + depthWrite avoids the
    // transparency-sort flicker of the old translucent slab; DoubleSide keeps the
    // open clip face from reading as a hole.
    const make = (clipPlanes: THREE.Plane[]): THREE.Mesh => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xeaeaea, // matches the SVG membrane fill
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
        clippingPlanes: clipPlanes,
        clipIntersection: false, // keep only the region inside ALL planes
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      mesh.layers.set(MEMBRANE_LAYER); // excluded from the AO camera
      mesh.renderOrder = -1;
      this.group.add(mesh);
      return mesh;
    };
    this.membraneL = make([this.clipNear, this.clipGapL]);
    this.membraneR = make([this.clipNear, this.clipGapR]);
  }

  /**
   * Size the membrane panels for morph fraction `e`. Each panel spans the full
   * bilayer band; the world-space clip planes (updateMembraneClip) carve away the
   * camera-facing half and the protein keep-out. Width eases from the full flat
   * arc (2-D) to the compact 3-D footprint.
   */
  private updateMembrane(e: number): void {
    if (!this.membraneL || !this.membraneR) return;
    const margin = 8;
    const halfW = lerp(this.flatHalfWidth + margin, this.solidHalfX + margin, e);
    const depth = (this.solidHalfDepth + margin) * 2;
    for (const m of [this.membraneL, this.membraneR]) {
      m.scale.set(halfW * 2, this.membraneHalf * 2, depth);
      m.position.set(0, 0, 0);
    }
  }

  /**
   * Update the world-space membrane clip planes from the current camera. Called
   * each frame after the camera is placed. The "near" plane keeps only the half
   * of the slab BEHIND the protein relative to the viewer, so orbiting can never
   * bring the slab in front of the structure. The two "gap" planes leave a
   * protein-width slot down the middle so the slab never intersects the protein.
   */
  private updateMembraneClip(): void {
    if (!this.membraneL) return;
    const e = smooth(this.t);
    const view = new THREE.Vector3();
    this.camera.getWorldDirection(view);
    view.y = 0; // keep the cut vertical so the bilayer stays level
    if (view.lengthSq() < 1e-6) view.set(0, 0, -1); // near top-down: degenerate guard
    view.normalize();
    const centre = this.group.position; // structure is centred at the group origin

    // (A) Camera-facing cut: keep the half on the far side of the protein centre.
    // `view` points from the camera into the scene, so the far half is its
    // positive side — exactly the half a clip plane with normal `view` keeps.
    this.clipNear.setFromNormalAndCoplanarPoint(view, centre);

    // (B) Keep-out slot: split along camera-right (= up × view); the gap grows
    // from nothing (flat band) to the protein footprint as it rolls up.
    const right = new THREE.Vector3(0, 1, 0).cross(view);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const keepR = lerp(0, this.ringR + 2, e);
    const pR = new THREE.Vector3().copy(centre).addScaledVector(right, keepR);
    const pL = new THREE.Vector3().copy(centre).addScaledVector(right, -keepR);
    this.clipGapR.setFromNormalAndCoplanarPoint(right, pR);
    this.clipGapL.setFromNormalAndCoplanarPoint(right.clone().negate(), pL);
  }

  setT(t: number): void {
    const prev = this.t;
    this.t = Math.max(0, Math.min(1, t));
    // Leaving the orbit-controlled 3-D state: anchor to the user's current view
    // so the roll-down eases from there back to the flat dead-on view.
    if (prev >= 1 && this.t < 1) this.captureAnchor();
    this.updateMorph();
  }

  get morph(): number {
    return this.t;
  }

  /**
   * Tell the renderer the SVG diagram's pixel-per-Ångström scale so the flat
   * (t=0) view is drawn at the *same* scale and centring as the 2-D diagram —
   * the two then overlay when the user flips between them.
   */
  setFlatPixelScale(pxPerA: number): void {
    this.flatPxPerA = pxPerA > 0 ? pxPerA : 0;
  }

  /** Capture the current camera orbit angle and distance as the 3-D anchor. */
  private captureAnchor(): void {
    const p = this.camera.position;
    const r = p.length() || 1;
    this.anchorAz = Math.atan2(p.x, p.z);
    this.anchorEl = Math.asin(THREE.MathUtils.clamp(p.y / r, -1, 1));
    this.anchorDist = r;
  }

  /** Distance that frames the structure at the 3-D field of view. */
  private framedDist(): number {
    return (this.sceneRadius / Math.sin(THREE.MathUtils.degToRad(FOV_3D) / 2)) * 1.06;
  }

  /**
   * Camera distance for the flat end at field of view `fov`. When the SVG scale
   * is known, choose the distance that makes 1 Å map to exactly `flatPxPerA`
   * device-independent pixels (so the flat 3-D view matches the SVG diagram);
   * otherwise fall back to fitting the bounding sphere.
   */
  private flatDist(fov: number): number {
    const half = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    if (this.flatPxPerA > 0) {
      const h = this.container.clientHeight || this.renderer.domElement.clientHeight || 1;
      const worldHalfHeight = h / 2 / this.flatPxPerA;
      return worldHalfHeight / half;
    }
    return (this.sceneRadius / Math.sin(THREE.MathUtils.degToRad(fov) / 2)) * 1.06;
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
        // Roll the cross-section (view XZ) from flat to real along an outward-
        // bowing curl so the sheet wraps onto the cylinder rather than collapsing
        // through the axis; the vertical axis (view Y = membrane depth) rides its
        // own honest track. Exact at the endpoints (flat at 0, real at 1).
        const f = el.flat[i];
        const s = el.solid[i];
        const xz = curlXZ(f.x, f.z, s.x, s.z, local, this.ringR);
        pts.push(new THREE.Vector3(xz.x, lerp(f.y, s.y, local), xz.z));
        // Ribbon face: camera-facing (+Z) flat so the strand arrow faces us;
        // rotates to the barrel-wall radial as it rolls.
        const flatFace = new THREE.Vector3(0, 0, 1);
        const solidFace = el.solidFace ? el.solidFace[i] : flatFace;
        faces.push(new THREE.Vector3().lerpVectors(flatFace, solidFace, local).normalize());
      }
      // Ribbon width grows from the SVG width (flat) to ~1 nm (3-D).
      const halfW = lerp(el.flatHalf, el.radius3d, e);
      const thickness = el.type === 'strand' ? lerp(el.thickFlat, el.thick3d, e) : halfW;
      this.writeSweep(el, pts, faces, halfW, thickness);
    }
    this.updateMembrane(e);

    let r = this.membraneHalf;
    for (const el of this.elements) {
      const bs = el.geometry.boundingSphere;
      if (bs) r = Math.max(r, bs.center.length() + bs.radius);
    }
    this.sceneRadius = r;
    // Tighten the depth range to the scene so the depth buffer has the precision
    // the AO pass and opaque membrane need (the old 0.1‥200000 range z-fought).
    this.camera.near = Math.max(0.1, this.sceneRadius * 0.02);
    this.camera.far = this.sceneRadius * 8 + this.membraneHalf * 4;
    this.camera.updateProjectionMatrix();
  }

  /** Sweep the element's cross-section along the morphed centreline. */
  private writeSweep(
    el: ElementRender,
    pts: THREE.Vector3[],
    faces: THREE.Vector3[],
    halfW: number,
    thickness: number,
  ): void {
    const pos = el.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const n = pts.length;
    // Arrowhead taper (ribbon): widen then collapse over the last stretch.
    const totalLen = polylineLength(pts);

    // Build a rotation-minimising (parallel-transport) frame along the curve,
    // seeded by faces[0]. A per-sample `bin = tangent × face` frame flips sign
    // when the tangent nears the face vector, which flickered every morph step;
    // propagating the frame by the minimal rotation between successive tangents
    // is stable, so the cross-section no longer twists frame-to-frame.
    const { bins, nors } = sweepFrame(pts, faces[0]);

    for (let i = 0; i < n; i++) {
      const bin = bins[i];
      const nor = nors[i];
      let w = halfW;
      if (el.arrow) {
        const arrowLen = Math.min(9, totalLen * 0.4);
        const dToTip = ((n - 1 - i) / (n - 1)) * totalLen;
        w = dToTip > arrowLen ? halfW : (halfW * 1.7 * dToTip) / arrowLen;
      }
      const base = i * el.ring * 3;
      if (el.ring === 4) {
        const corners: [number, number][] = [
          [w, thickness],
          [w, -thickness],
          [-w, -thickness],
          [-w, thickness],
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
      this.camera.fov = FOV_3D;
      this.camera.updateProjectionMatrix();
      if (!this.controls.enabled) {
        // Place at the anchor (default 3/4 on entry) then hand off to the user.
        this.placeCamera(this.anchorAz, this.anchorEl, this.anchorDist ?? this.framedDist());
        this.controls.enabled = true;
      }
      this.controls.update();
      this.renderFrame();
      return;
    }
    this.controls.enabled = false;
    // Ease from the flat dead-on near-orthographic view (e=0) to the 3-D anchor
    // (e=1). Because the anchor is the user's captured orbit on a roll-down, the
    // structure rotates smoothly back to face-on from whatever angle it was at.
    const e = smooth(this.t);
    const fov = lerp(FOV_FLAT, FOV_3D, e);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    const dist = lerp(this.flatDist(fov), this.anchorDist ?? this.framedDist(), e);
    this.placeCamera(lerp(0, this.anchorAz, e), lerp(0, this.anchorEl, e), dist);
    this.renderFrame();
  };

  /**
   * Render one frame: refresh the camera-tracking membrane clip, then draw
   * through the post-processing composer (outlines + AO). Ambient occlusion is
   * gated to the resting state so it never has to run on the per-frame-rebuilt
   * geometry mid-roll.
   */
  private renderFrame(): void {
    this.updateMembraneClip();
    if (this.composer) {
      if (this.gtaoPass) this.gtaoPass.enabled = this.t >= 1;
      // Keep the AO camera in lock-step with the beauty camera (protein layer only).
      this.aoCamera.copy(this.camera);
      this.aoCamera.layers.set(0);
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Build the post-processing chain: render → AO → outline → AA → output. */
  private buildComposer(): void {
    const dpr = this.renderer.getPixelRatio();
    const size = this.renderer.getSize(new THREE.Vector2());
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const pxW = Math.max(1, Math.round(w * dpr));
    const pxH = Math.max(1, Math.round(h * dpr));

    const composer = new EffectComposer(this.renderer);
    // RenderPass uses the real materials, so the membrane's clipping planes are
    // honoured here (the beauty image shows the cut slab).
    composer.addPass(new RenderPass(this.scene, this.camera));

    // Ambient occlusion from a protein-only camera so the (clip-ignoring) AO
    // G-buffer never includes the full uncut membrane slab.
    const gtao = new GTAOPass(this.scene, this.aoCamera, pxW, pxH);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.updateGtaoMaterial({ radius: 4, distanceExponent: 1, thickness: 1, scale: 1, samples: 8 });
    gtao.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      radiusExponent: 1,
      rings: 2,
      samples: 8,
    });
    composer.addPass(gtao);
    this.gtaoPass = gtao;

    // Silhouette/crease outline on the protein elements (membrane excluded).
    const outline = new OutlinePass(new THREE.Vector2(pxW, pxH), this.scene, this.camera);
    outline.edgeStrength = 3;
    outline.edgeThickness = 1;
    outline.edgeGlow = 0;
    outline.pulsePeriod = 0;
    outline.visibleEdgeColor.set(OUTLINE_COLOUR);
    outline.hiddenEdgeColor.set(OUTLINE_COLOUR);
    composer.addPass(outline);
    this.outlinePass = outline;

    composer.addPass(new SMAAPass());
    composer.addPass(new OutputPass());

    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    this.composer = composer;
    this.refreshOutlineSelection();
  }

  /** (Re)bind the outline pass to the current element meshes (rebuilt per scene). */
  private refreshOutlineSelection(): void {
    if (this.outlinePass) this.outlinePass.selectedObjects = this.elements.map((el) => el.mesh);
  }

  /** Position the camera on a sphere about the origin at (azimuth, elevation). */
  private placeCamera(az: number, el: number, dist: number): void {
    this.camera.position.set(
      dist * Math.sin(az) * Math.cos(el),
      dist * Math.sin(el),
      dist * Math.cos(az) * Math.cos(el),
    );
    this.camera.lookAt(0, 0, 0);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.controls.dispose();
    this.gtaoPass?.dispose();
    this.outlinePass?.dispose();
    this.composer?.dispose();
    this.composer = null;
    this.gtaoPass = null;
    this.outlinePass = null;
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

/**
 * A rotation-minimising frame (binormal + normal per sample) along a polyline,
 * seeded by `seedFace`. Propagating the frame by the minimal rotation between
 * successive tangents avoids the per-sample sign flips that flickered when the
 * cross-section was framed independently each step.
 */
function sweepFrame(
  pts: THREE.Vector3[],
  seedFace: THREE.Vector3,
): { bins: THREE.Vector3[]; nors: THREE.Vector3[] } {
  const n = pts.length;
  const tangents: THREE.Vector3[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const tg = new THREE.Vector3();
    if (i === 0) tg.subVectors(pts[1], pts[0]);
    else if (i === n - 1) tg.subVectors(pts[i], pts[i - 1]);
    else tg.subVectors(pts[i + 1], pts[i - 1]);
    const L = tg.length();
    tangents[i] = L > 1e-6 ? tg.divideScalar(L) : new THREE.Vector3(1, 0, 0);
  }
  // Seed the normal from the desired face, orthogonalised against the tangent.
  let nor0 = seedFace.clone().addScaledVector(tangents[0], -seedFace.dot(tangents[0]));
  if (nor0.lengthSq() < 1e-6) {
    nor0 = new THREE.Vector3(0, 1, 0).addScaledVector(tangents[0], -tangents[0].y);
    if (nor0.lengthSq() < 1e-6) nor0.set(1, 0, 0);
  }
  nor0.normalize();
  const nors: THREE.Vector3[] = new Array(n);
  const bins: THREE.Vector3[] = new Array(n);
  nors[0] = nor0;
  bins[0] = new THREE.Vector3().crossVectors(tangents[0], nor0).normalize();
  const axis = new THREE.Vector3();
  const q = new THREE.Quaternion();
  for (let i = 1; i < n; i++) {
    axis.crossVectors(tangents[i - 1], tangents[i]);
    const sin = axis.length();
    const cos = THREE.MathUtils.clamp(tangents[i - 1].dot(tangents[i]), -1, 1);
    if (sin < 1e-6) {
      nors[i] = nors[i - 1].clone();
    } else {
      axis.divideScalar(sin);
      q.setFromAxisAngle(axis, Math.atan2(sin, cos));
      nors[i] = nors[i - 1].clone().applyQuaternion(q).normalize();
    }
    bins[i] = new THREE.Vector3().crossVectors(tangents[i], nors[i]).normalize();
  }
  return { bins, nors };
}
