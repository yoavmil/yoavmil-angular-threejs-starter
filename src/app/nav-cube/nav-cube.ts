import * as THREE from 'three';
import { Vector3 } from 'three';

class NavCubeParams {
  camera: THREE.Camera;
  div: HTMLDivElement;
  homePosition: Vector3 = new Vector3(-1, -1, 1);
  // tween: boolean = false; TODO
  // showHome: boolean = false; TODO
  // highLight: boolean = false; TODO
  champer: number = 0.1; // precentage
  cubeBaseColorStyle: string = 'white'; // TODO change to number
  labelColorStyle: string = 'black'; // TODO change to number
}

enum Sides {
  Front = 1 << 1,
  Back = 1 << 2,
  Left = 1 << 3,
  Right = 1 << 4,
  Top = 1 << 5,
  Bottom = 1 << 6,
}

class NavCube {
  params: NavCubeParams;
  renderer: THREE.WebGLRenderer;
  localCamera: THREE.PerspectiveCamera;
  cubeMesh: THREE.Mesh;
  scene: THREE.Scene;
  radius: number = 2 * Math.sqrt(2);

  constructor(params: NavCubeParams) {
    this.params = params;
    this.fillParams();
    this.createRenderer();
    this.createScene();
    this.createCamera();
    this.render();
  }

  fillParams() {
    if (!this.params) this.params = new NavCubeParams();

    if (!this.params.div) throw new Error('No div passed by user');
    if (this.params.div.clientWidth == 0 || this.params.div.clientHeight == 0)
      throw new Error('div client width or height == 0');
    if (
      !this.params.cubeBaseColorStyle ||
      this.params.cubeBaseColorStyle.length == 0
    )
      this.params.cubeBaseColorStyle = 'white';
    if (!this.params.labelColorStyle || this.params.labelColorStyle.length == 0)
      this.params.labelColorStyle = 'black';
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    let canvasWidth = this.params.div.clientWidth;
    let canvasHeight = this.params.div.clientHeight;
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.params.div.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(0, 0); // transparent background
  }

  createScene() {
    this.cubeMesh = new THREE.Mesh();
    this.createMainFacets();
    this.createEdgeFacets();
    this.createCornerFacets();
    this.createLabels();

    this.scene = new THREE.Scene();
    this.scene.add(this.cubeMesh);
  }

  createMainFacets() {
    // it's math: the projection of the champer on the plane is champer / sqrt(2)
    // (Pythagoras), reduce from both side and you get:
    let width = 1.0 - Math.sqrt(2) * this.params.champer;
    let plane = new THREE.PlaneGeometry(width, width).translate(0, 0, 0.5);
    let halfPi = Math.PI / 2;
    let geoms = [];

    geoms[Sides.Front] = plane.clone().rotateX(halfPi);
    geoms[Sides.Back] = plane.clone().rotateX(-halfPi).rotateY(Math.PI);
    geoms[Sides.Left] = plane.clone().rotateY(-halfPi).rotateX(halfPi);
    geoms[Sides.Right] = plane.clone().rotateY(halfPi).rotateX(halfPi);
    geoms[Sides.Top] = plane.clone();
    geoms[Sides.Bottom] = plane.clone().rotateX(-Math.PI);

    geoms.forEach((geom, i) => {
      let mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
      mesh.userData.sides = i;
      this.cubeMesh.add(mesh);
    });
  }

  createEdgeFacets() {
    // it's math: the projection of the champer on the plane is champer / sqrt(2)
    // (Pythagoras), reduce from both side and you get:
    let width = this.params.champer;
    let height = 1.0 - Math.sqrt(2) * this.params.champer;
    let plane = new THREE.PlaneGeometry(width, height);
    let mat = new THREE.MeshBasicMaterial({
      color: this.params.cubeBaseColorStyle,
    });
    let piBy2 = Math.PI / 2;
    let piBy4 = Math.PI / 4;
    let geoms = [];
    let offset: number = Math.sqrt(2) / 2 - this.params.champer / 2;
    plane.translate(0, 0, offset);

    // side edges
    geoms[Sides.Front | Sides.Right] = plane
      .clone()
      .rotateX(piBy2)
      .rotateZ(piBy4);
    geoms[Sides.Right | Sides.Back] = geoms[Sides.Front | Sides.Right]
      .clone()
      .rotateZ(piBy2);
    geoms[Sides.Back | Sides.Left] = geoms[Sides.Right | Sides.Back]
      .clone()
      .rotateZ(piBy2);
    geoms[Sides.Left | Sides.Front] = geoms[Sides.Back | Sides.Left]
      .clone()
      .rotateZ(piBy2);

    // top edges
    geoms[Sides.Top | Sides.Right] = plane.clone().rotateY(piBy4);
    geoms[Sides.Top | Sides.Back] = geoms[Sides.Top | Sides.Right]
      .clone()
      .rotateZ(piBy2);
    geoms[Sides.Top | Sides.Left] = geoms[Sides.Top | Sides.Back]
      .clone()
      .rotateZ(piBy2);
    geoms[Sides.Top | Sides.Front] = geoms[Sides.Top | Sides.Left]
      .clone()
      .rotateZ(piBy2);

    // botom edges
    geoms[Sides.Bottom | Sides.Right] = plane.clone().rotateY(piBy4 + piBy2);
    geoms[Sides.Bottom | Sides.Back] = geoms[Sides.Bottom | Sides.Right]
      .clone()
      .rotateZ(piBy2);
    geoms[Sides.Bottom | Sides.Left] = geoms[Sides.Bottom | Sides.Back]
      .clone()
      .rotateZ(piBy2);
    geoms[Sides.Bottom | Sides.Front] = geoms[Sides.Bottom | Sides.Left]
      .clone()
      .rotateZ(piBy2);

    geoms.forEach((geom, i) => {
      let sideMat = mat.clone();
      let mesh = new THREE.Mesh(geom, sideMat);
      mesh.userData.sise = i;
      this.cubeMesh.add(mesh);

      // create wireframe
      let border = new THREE.Geometry();
      border.vertices.push(geom.vertices[0]);
      border.vertices.push(geom.vertices[1]);
      border.vertices.push(geom.vertices[3]);
      border.vertices.push(geom.vertices[2]);
      border.vertices.push(geom.vertices[0]);

      const lineMat = new THREE.LineBasicMaterial({ color: 'black' }); // TODO make param
      var line = new THREE.Line(border, lineMat);
      this.cubeMesh.add(line);
    });
  }

  getClosesVertexOfPlaneMesh(mesh: THREE.Mesh, vec: Vector3): Vector3 {
    let geom: THREE.PlaneGeometry = mesh.geometry as THREE.PlaneGeometry;
    let closest: Vector3 = geom.vertices[0];
    let bestDist = closest.distanceTo(vec);
    for (let i = 1; i < geom.vertices.length; i++) {
      let dist = geom.vertices[i].distanceTo(vec);
      if (dist < bestDist) {
        bestDist = dist;
        closest = geom.vertices[i];
      }
    }
    return closest;
  }

  getMeshOfSide(side: Sides): THREE.Mesh {
    return this.cubeMesh.children.find(
      (m) => m.userData.sides == side
    ) as THREE.Mesh;
  }

  getTriangleOfSides(
    a: Sides,
    b: Sides,
    c: Sides,
    corner: Vector3
  ): THREE.Triangle {
    return new THREE.Triangle(
      this.getClosesVertexOfPlaneMesh(this.getMeshOfSide(a), corner),
      this.getClosesVertexOfPlaneMesh(this.getMeshOfSide(b), corner),
      this.getClosesVertexOfPlaneMesh(this.getMeshOfSide(c), corner)
    );
  }

  createCornerMesh(a: Sides, b: Sides, c: Sides, corner: Vector3): THREE.Mesh {
    let geom = new THREE.Geometry();
    let triangle = this.getTriangleOfSides(a, b, c, corner);
    geom.vertices.push(triangle.a);
    geom.vertices.push(triangle.b);
    geom.vertices.push(triangle.c);
    geom.faces.push(new THREE.Face3(0, 1, 2));
    let mat = new THREE.MeshBasicMaterial({
      color: this.params.cubeBaseColorStyle,
    });
    let mesh = new THREE.Mesh(geom, mat);
    mesh.userData.sides = a | b | c;
    return mesh;
  }

  createCornerFacets() {
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Left,
        Sides.Front,
        Sides.Top,
        new Vector3(-1, -1, 1)
      )
    );
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Front,
        Sides.Right,
        Sides.Top,
        new Vector3(1, -1, 1)
      )
    );
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Right,
        Sides.Back,
        Sides.Top,
        new Vector3(1, 1, 1)
      )
    );
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Back,
        Sides.Left,
        Sides.Top,
        new Vector3(-1, 1, 1)
      )
    );

    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Front,
        Sides.Left,
        Sides.Bottom,
        new Vector3(-1, -1, -1)
      )
    );
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Right,
        Sides.Front,
        Sides.Bottom,
        new Vector3(1, -1, -1)
      )
    );
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Back,
        Sides.Right,
        Sides.Bottom,
        new Vector3(1, 1, -1)
      )
    );
    this.cubeMesh.add(
      this.createCornerMesh(
        Sides.Left,
        Sides.Back,
        Sides.Bottom,
        new Vector3(-1, 1, -1)
      )
    );
  }

  render() {
    let userDirection: Vector3 = new Vector3();
    let localDirection: Vector3 = new Vector3();
    this.params.camera.getWorldDirection(userDirection);
    this.localCamera.getWorldDirection(localDirection);
    let changed = localDirection.dot(userDirection) < 0.9999;

    if (changed) {
      this.localCamera.position
        .copy(userDirection)
        .multiplyScalar(-this.radius);
      this.localCamera.lookAt(0, 0, 0);
      this.localCamera.updateMatrix();
      this.renderer.render(this.scene, this.localCamera);
    }

    setTimeout(() => {
      requestAnimationFrame(() => this.render());
    }, 1000 / 60);
  }

  createCamera() {
    let ratio = this.params.div.clientWidth / this.params.div.clientHeight;
    this.localCamera = new THREE.PerspectiveCamera(45, ratio, 0.01, 5);
    this.localCamera.up = this.params.camera.up.clone();
  }

  createLabels() {
    let sides = [
      Sides.Front,
      Sides.Back,
      Sides.Left,
      Sides.Right,
      Sides.Top,
      Sides.Bottom,
    ];
    let canvasSize = 300;
    let fontSize: number = 72;

    {
      // find common font size
      let longestString = Sides[Sides.Bottom];
      let canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      let ctx = canvas.getContext('2d');

      ctx.font = `bold ${fontSize}px Arial`;
      let pixels = ctx.measureText(longestString);
      let ratio = canvasSize / pixels.width;
      fontSize = Math.round(fontSize * ratio * 0.9); // 90% for padding
    }

    for (let i in sides) {
      let side = sides[i];
      let str = Sides[side];

      let canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      let ctx = canvas.getContext('2d');
      ctx.fillStyle = this.params.cubeBaseColorStyle;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.params.labelColorStyle;
      ctx.fillText(str, canvas.width / 2, canvas.height / 2);

      let mesh = this.getMeshOfSide(side);
      let mat = mesh.material as THREE.MeshBasicMaterial;
      mat.map = new THREE.CanvasTexture(canvas);
    }
  }
}

export { NavCube, NavCubeParams };
