// تابع اصلی برنامه
async function init() {
  try {
    // صبر کردن برای بارگذاری Ammo.js
    if (typeof Ammo === "undefined") {
      throw new Error("Ammo.js هنوز بارگذاری نشده است");
    }

    // اطمینان از اینکه Ammo.js به درستی مقداردهی شده است
    if (typeof Ammo === "function") {
      await new Promise((resolve, reject) => {
        Ammo().then(resolve).catch(reject);
      });
    }

    console.log("Ammo.js با موفقیت بارگذاری شد");

    // تنظیمات اولیه
    const scene = new THREE.Scene();

    // تنظیمات دوربین
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);

    // تنظیمات رندرر
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    // تنظیمات کنترل‌ها
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    // تنظیمات نور
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(5, 13, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const bottomLight = new THREE.PointLight(0xff00ff, 0.2, 100);
    bottomLight.position.set(1, -3, 1);
    scene.add(bottomLight);

    // متغیرهای جهانی
    let physicsWorld;
    let transformAux1;
    let balls = [];
    let ballBodies = [];
    let isSceneReady = false;
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    // تنظیمات فیزیک
    function initPhysics() {
      const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
      const broadphase = new Ammo.btDbvtBroadphase();
      const solver = new Ammo.btSequentialImpulseConstraintSolver();
      physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration
      );
      physicsWorld.setGravity(new Ammo.btVector3(0, 0, 0)); // گرانش صفر در ابتدا
      transformAux1 = new Ammo.btTransform();
    }

    // تابع ایجاد توپ
    function createBall(position, color) {
      const radius = 2.6;
      const segments = 64;
      const ballGeometry = new THREE.SphereGeometry(radius, segments, segments);
      const ballMaterial = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.6,
        roughness: 0.6,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
      });
      const ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.castShadow = true;
      ball.receiveShadow = true;
      ball.position.copy(position);
      scene.add(ball);

      // اضافه کردن فیزیک به توپ
      const shape = new Ammo.btSphereShape(radius);
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(
        new Ammo.btVector3(position.x, position.y, position.z)
      );
      const motionState = new Ammo.btDefaultMotionState(transform);
      const mass = 1;
      const localInertia = new Ammo.btVector3(0, 0, 0);
      shape.calculateLocalInertia(mass, localInertia);
      const rbInfo = new Ammo.btRigidBodyConstructionInfo(
        mass,
        motionState,
        shape,
        localInertia
      );
      const body = new Ammo.btRigidBody(rbInfo);

      body.setRestitution(0.5);
      body.setFriction(0.8);
      body.setRollingFriction(0.2);
      body.setDamping(0.3, 0.3);

      // غیرفعال کردن حرکت اولیه
      body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
      body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
      body.setActivationState(4); // DISABLE_DEACTIVATION

      physicsWorld.addRigidBody(body);
      balls.push(ball);
      ballBodies.push(body);
      return body;
    }

    // مسیر فایل مدل
    const modelPath = "models/KAF.obj";
    console.log("در حال بارگذاری مدل از مسیر:", modelPath);

    // بارگذاری مدل
    const loader = new THREE.OBJLoader();
    loader.load(
      modelPath,
      function (object) {
        console.log("مدل با موفقیت بارگذاری شد");
        object.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0xdd4400,
              metalness: 0.1,
              roughness: 0.9,
              clearcoat: 0.1,
              clearcoatRoughness: 0.8,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 1,
            });

            // ایجاد شکل فیزیکی دقیق برای KAF
            const vertices = child.geometry.attributes.position.array;
            const indices = [];
            for (let i = 0; i < vertices.length / 3; i++) {
              indices.push(i);
            }

            const triangleMesh = new Ammo.btTriangleMesh();
            for (let i = 0; i < indices.length; i += 3) {
              const v1 = new Ammo.btVector3(
                vertices[indices[i] * 3],
                vertices[indices[i] * 3 + 1],
                vertices[indices[i] * 3 + 2]
              );
              const v2 = new Ammo.btVector3(
                vertices[indices[i + 1] * 3],
                vertices[indices[i + 1] * 3 + 1],
                vertices[indices[i + 1] * 3 + 2]
              );
              const v3 = new Ammo.btVector3(
                vertices[indices[i + 2] * 3],
                vertices[indices[i + 2] * 3 + 1],
                vertices[indices[i + 2] * 3 + 2]
              );
              triangleMesh.addTriangle(v1, v2, v3, false);
            }

            const shape = new Ammo.btBvhTriangleMeshShape(
              triangleMesh,
              true,
              true
            );
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(
              new Ammo.btVector3(
                child.position.x,
                child.position.y,
                child.position.z
              )
            );
            const motionState = new Ammo.btDefaultMotionState(transform);
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(
              0,
              motionState,
              shape,
              new Ammo.btVector3(0, 0, 0)
            );
            const body = new Ammo.btRigidBody(rbInfo);
            body.setRestitution(0.5);
            body.setFriction(0.8);
            physicsWorld.addRigidBody(body);
          }
        });
        scene.add(object);

        // تنظیمات نیم‌کره شفاف
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const hemisphereRadius = Math.max(size.x, size.z) * 0.4;
        const hemisphereGeometry = new THREE.SphereGeometry(
          hemisphereRadius,
          200,
          200,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        const hemisphereMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xf0fdff,
          transparent: true,
          opacity: 0.15,
          roughness: 0.3,
          metalness: 0.9,
          clearcoat: 0.1,
          clearcoatRoughness: 0.9,
          side: THREE.DoubleSide,
          envMapIntensity: 0.5
        });
        const hemisphere = new THREE.Mesh(
          hemisphereGeometry,
          hemisphereMaterial
        );
        hemisphere.position.set(center.x, size.y - 5, center.z);
        hemisphere.castShadow = false;
        hemisphere.receiveShadow = true;
        scene.add(hemisphere);

        // اضافه کردن فیزیک برای محفظه شیشه‌ای
        const segments = 16;
        const phiStart = 0;
        const phiLength = Math.PI * 2;
        const thetaStart = 0;
        const thetaLength = Math.PI / 2;

        const triangleMesh = new Ammo.btTriangleMesh();

        // ایجاد مش برای نیم‌کره
        for (
          let phi = phiStart;
          phi < phiStart + phiLength;
          phi += phiLength / segments
        ) {
          for (
            let theta = thetaStart;
            theta < thetaStart + thetaLength;
            theta += thetaLength / segments
          ) {
            const v1 = new Ammo.btVector3(
              hemisphereRadius * Math.sin(theta) * Math.cos(phi) + center.x,
              hemisphereRadius * Math.cos(theta) + size.y,
              hemisphereRadius * Math.sin(theta) * Math.sin(phi) + center.z
            );
            const v2 = new Ammo.btVector3(
              hemisphereRadius *
                Math.sin(theta) *
                Math.cos(phi + phiLength / segments) +
                center.x,
              hemisphereRadius * Math.cos(theta) + size.y,
              hemisphereRadius *
                Math.sin(theta) *
                Math.sin(phi + phiLength / segments) +
                center.z
            );
            const v3 = new Ammo.btVector3(
              hemisphereRadius *
                Math.sin(theta + thetaLength / segments) *
                Math.cos(phi) +
                center.x,
              hemisphereRadius * Math.cos(theta + thetaLength / segments) +
                size.y,
              hemisphereRadius *
                Math.sin(theta + thetaLength / segments) *
                Math.sin(phi) +
                center.z
            );
            triangleMesh.addTriangle(v1, v2, v3, false);
          }
        }

        const hemisphereShape = new Ammo.btBvhTriangleMeshShape(
          triangleMesh,
          true,
          true
        );
        const hemisphereTransform = new Ammo.btTransform();
        hemisphereTransform.setIdentity();
        const hemisphereMotionState = new Ammo.btDefaultMotionState(
          hemisphereTransform
        );
        const hemisphereRbInfo = new Ammo.btRigidBodyConstructionInfo(
          0,
          hemisphereMotionState,
          hemisphereShape,
          new Ammo.btVector3(0, 0, 0)
        );
        const hemisphereBody = new Ammo.btRigidBody(hemisphereRbInfo);
        hemisphereBody.setRestitution(0.3);
        hemisphereBody.setFriction(0.5);
        physicsWorld.addRigidBody(hemisphereBody);

        // اضافه کردن توپ‌ها با اندازه کوچکتر
        const ballStartHeight = size.y + hemisphereRadius * 0.4; // ارتفاع بیشتر برای توپ‌ها
        const ballCircleRadius = hemisphereRadius * 0.2;
        const positions = [
          { x: 0, z: 0 },
          { x: 0.3, z: 0.3 },
          { x: -0.3, z: 0.3 },
          { x: -0.3, z: -0.3 },
          { x: 0.3, z: -0.3 },
        ];

        positions.forEach((pos, i) => {
          const x = center.x + pos.x * ballCircleRadius;
          const z = center.z + pos.z * ballCircleRadius;
          createBall(new THREE.Vector3(x, ballStartHeight, z), colors[i]);
        });

        // تنظیم دوربین بر اساس اندازه مدل
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

        camera.position.set(
          center.x + cameraZ,
          center.y + cameraZ / 2,
          center.z + cameraZ
        );
        camera.lookAt(center);

        controls.target.copy(center);
        controls.minDistance = maxDim * 0.5;
        controls.maxDistance = maxDim * 3;

        document.getElementById("info").textContent = "صورت‌های فضایی";

        // تنظیم آماده بودن صحنه
        isSceneReady = true;
        console.log("صحنه آماده است");
      },
      function (xhr) {
        const percent = ((xhr.loaded / xhr.total) * 100).toFixed(0);
        document.getElementById(
          "info"
        ).textContent = `در حال بارگذاری: ${percent}%`;
        console.log(`بارگذاری: ${percent}%`);
      },
      function (error) {
        console.error("خطا در بارگذاری مدل:", error);
        document.getElementById("info").textContent =
          "خطا در بارگذاری مدل. لطفاً مطمئن شوید که فایل KAF.obj در پوشه models قرار دارد.";
      }
    );

    // تابع پرتاب توپ‌ها
    function throwBalls() {
      if (!isSceneReady) {
        console.log("صحنه هنوز آماده نیست");
        return;
      }

      console.log("پرتاب توپ‌ها...");
      physicsWorld.setGravity(new Ammo.btVector3(0, -30, 0));

      ballBodies.forEach((body) => {
        body.activate(true);
        const force = 20;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * force;
        const z = Math.sin(angle) * force;
        const y = force * 0.5;
        body.setLinearVelocity(new Ammo.btVector3(x, y, z));
      });
    }

    // اضافه کردن رویدادهای کلیک و لمس برای پرتاب توپ‌ها
    // window.addEventListener('click', throwBalls);

    // حذف متن راهنما
    const infoElement = document.getElementById("info");
    if (infoElement) {
      infoElement.style.display = "none";
    }

    // اضافه کردن رویداد کلیک به دکمه شروع
    document
      .getElementById("throwButton")
      .addEventListener("click", function (event) {
        throwBalls();
      });

    function animate() {
      requestAnimationFrame(animate);

      if (physicsWorld) {
        physicsWorld.stepSimulation(1 / 60, 10);

        for (let i = 0; i < balls.length; i++) {
          const body = ballBodies[i];
          const motionState = body.getMotionState();
          if (motionState) {
            motionState.getWorldTransform(transformAux1);
            const pos = transformAux1.getOrigin();
            balls[i].position.set(pos.x(), pos.y(), pos.z());
            const quat = transformAux1.getRotation();
            balls[i].quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    }

    initPhysics();
    animate();

    window.addEventListener("resize", onWindowResize, false);
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  } catch (error) {
    console.error("خطا در راه‌اندازی برنامه:", error);
    document.getElementById("info").textContent =
      "خطا در راه‌اندازی برنامه. لطفاً صفحه را رفرش کنید.";
    throw error;
  }
}

init().catch((error) => {
  console.error("خطا در راه‌اندازی برنامه:", error);
  document.getElementById("info").textContent =
    "خطا در راه‌اندازی برنامه. لطفاً صفحه را رفرش کنید.";
});
