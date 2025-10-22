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

    // تشخیص موبایل
    function detectMobile() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
                 ('ontouchstart' in window) ||
                 (navigator.maxTouchPoints > 0);
      console.log('تشخیص موبایل:', isMobile);
      return isMobile;
    }

    // تابع ایجاد محور رنگی گرانش
    function createGravityArrow() {
      // حذف محور قبلی اگر وجود داشته باشد
      if (gravityArrow) {
        scene.remove(gravityArrow);
      }

      // ایجاد محور گرانش
      const arrowGeometry = new THREE.ConeGeometry(0.5, 3, 8);
      const arrowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
      });
      gravityArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      
      // قرار دادن محور در مرکز صحنه
      gravityArrow.position.set(0, 0, 0);
      scene.add(gravityArrow);
      
      // به‌روزرسانی وضعیت محور
      const arrowStatusElement = document.getElementById('arrowStatus');
      if (arrowStatusElement) {
        arrowStatusElement.textContent = 'ایجاد شد';
        arrowStatusElement.style.color = '#4CAF50';
      }
      
      console.log('محور گرانش ایجاد شد');
    }

    // تابع به‌روزرسانی محور گرانش
    function updateGravityArrow(gravityX, gravityY, gravityZ) {
      if (!gravityArrow) return;

      // محاسبه جهت گرانش
      const gravityVector = new THREE.Vector3(gravityX, gravityY, gravityZ);
      gravityVector.normalize();

      // چرخش محور به سمت گرانش
      gravityArrow.lookAt(gravityVector);
      gravityArrow.rotateX(Math.PI / 2); // تنظیم جهت

      // تغییر رنگ بر اساس قدرت گرانش
      const strength = Math.sqrt(gravityX * gravityX + gravityY * gravityY + gravityZ * gravityZ);
      const intensity = Math.min(strength / 30, 1); // نرمال‌سازی
      
      if (gravityArrow.material) {
        gravityArrow.material.color.setHSL(0, 1, intensity * 0.5 + 0.5); // قرمز با شدت متغیر
      }
    }

    // تنظیمات اولیه
    const scene = new THREE.Scene();

    // تنظیمات دوربین
    const camera = new THREE.PerspectiveCamera(
      50,
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
    const maxPixelRatio = 2; // محدودیت برای بهبود عملکرد روی موبایل
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    // تنظیمات کنترل‌ها - ثابت کردن دوربین
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enabled = false; // غیرفعال کردن کنترل‌های دوربین

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
    let kafObject = null;
    let kafPivot = null;
    let kafBody = null;
    let kafMeshes = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isRotatingKaf = false;
    const lastMouse = new THREE.Vector2();
    const rotationSpeed = 0.01;
    const kafInitialQuat = new THREE.Quaternion();
    let isReturning = false;
    let returnStartTime = 0;
    let returnDuration = 0.9; // ثانیه
    const returnStartQuat = new THREE.Quaternion();
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    // متغیرهای ژیروسکوپ
    let gyroEnabled = false;
    let lastGyroData = { alpha: 0, beta: 0, gamma: 0 };
    let gyroSensitivity = 0.05; // حساسیت بالا و ثابت
    let isGyroSupported = false;
    let isMobile = false;
    let gravityArrow = null; // محور رنگی گرانش

    // تابع بررسی پشتیبانی از ژیروسکوپ (روش سنتی)
    function checkGyroSupport() {
      console.log('بررسی پشتیبانی از ژیروسکوپ...');
      
      // بررسی پشتیبانی از DeviceOrientationEvent
      if (typeof DeviceOrientationEvent !== 'undefined') {
        console.log('DeviceOrientationEvent پشتیبانی می‌شود');
        isGyroSupported = true;
        return true;
      }
      
      // بررسی پشتیبانی از DeviceMotionEvent (fallback)
      if (typeof DeviceMotionEvent !== 'undefined') {
        console.log('DeviceMotionEvent پشتیبانی می‌شود');
        isGyroSupported = true;
        return true;
      }
      
      // بررسی پشتیبانی از window.orientation (fallback قدیمی)
      if (typeof window.orientation !== 'undefined') {
        console.log('window.orientation پشتیبانی می‌شود');
        isGyroSupported = true;
        return true;
      }
      
      console.log('هیچ روش ژیروسکوپ پشتیبانی نمی‌شود');
      return false;
    }

    // تابع درخواست مجوز ژیروسکوپ (فقط برای iOS)
    async function requestGyroPermission() {
      // فقط برای iOS که نیاز به مجوز دارد
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          return permission === 'granted';
        } catch (error) {
          console.error('خطا در درخواست مجوز ژیروسکوپ:', error);
          return false;
        }
      }
      
      // برای اندروید و سایر مرورگرها، مجوز لازم نیست
      return true;
    }

    // تابع فعال‌سازی ژیروسکوپ (روش سنتی)
    async function enableGyroscope() {
      if (!checkGyroSupport()) {
        console.log('ژیروسکوپ پشتیبانی نمی‌شود');
        if (!isMobile) {
          alert('ژیروسکوپ در این مرورگر پشتیبانی نمی‌شود. لطفاً از مرورگر جدیدتری استفاده کنید.');
        }
        return false;
      }

      // بررسی HTTPS فقط برای iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.log('ژیروسکوپ نیاز به HTTPS دارد');
        if (!isMobile) {
          alert('برای استفاده از ژیروسکوپ، سایت باید از HTTPS استفاده کند.');
        }
        return false;
      }

      // درخواست مجوز فقط برای iOS
      const hasPermission = await requestGyroPermission();
      if (!hasPermission) {
        console.log('مجوز ژیروسکوپ داده نشد');
        if (!isMobile) {
          alert('برای استفاده از ژیروسکوپ، مجوز دسترسی به سنسورها لازم است.');
        }
        return false;
      }

      gyroEnabled = true;
      
      // استفاده از روش سنتی برای اضافه کردن event listener
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleGyroData, false);
        console.log('ژیروسکوپ با DeviceOrientationEvent فعال شد');
      } else if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotionData, false);
        console.log('ژیروسکوپ با DeviceMotionEvent فعال شد');
      }
      
      return true;
    }

    // تابع فعال‌سازی خودکار ژیروسکوپ در موبایل
    async function autoEnableGyroscope() {
      if (isMobile && checkGyroSupport()) {
        console.log('فعال‌سازی خودکار ژیروسکوپ در موبایل...');
        console.log('isMobile:', isMobile);
        console.log('checkGyroSupport():', checkGyroSupport());
        
        const success = await enableGyroscope();
        console.log('نتیجه فعال‌سازی ژیروسکوپ:', success);
        if (success) {
          console.log('ژیروسکوپ به صورت خودکار فعال شد');
          gyroEnabled = true;
        } else {
          console.log('ژیروسکوپ فعال نشد');
        }
      } else {
        console.log('شرایط فعال‌سازی ژیروسکوپ برقرار نیست');
        console.log('isMobile:', isMobile);
        console.log('checkGyroSupport():', checkGyroSupport());
      }
    }

    // تابع شبیه‌سازی ژیروسکوپ برای HTTP
    function simulateGyroscope() {
      console.log('شبیه‌سازی ژیروسکوپ شروع شد');
      gyroEnabled = true;
      
      // شبیه‌سازی داده‌های ژیروسکوپ
      let alpha = 0;
      let beta = 0;
      let gamma = 0;
      
      const simulateData = () => {
        // شبیه‌سازی تغییرات کوچک
        alpha += (Math.random() - 0.5) * 2;
        beta += (Math.random() - 0.5) * 2;
        gamma += (Math.random() - 0.5) * 2;
        
        // محدود کردن مقادیر
        alpha = Math.max(0, Math.min(360, alpha));
        beta = Math.max(-180, Math.min(180, beta));
        gamma = Math.max(-90, Math.min(90, gamma));
        
        // نمایش داده‌ها
        const alphaElement = document.getElementById('alphaValue');
        const betaElement = document.getElementById('betaValue');
        const gammaElement = document.getElementById('gammaValue');
        
        if (alphaElement) alphaElement.textContent = alpha.toFixed(1);
        if (betaElement) betaElement.textContent = beta.toFixed(1);
        if (gammaElement) gammaElement.textContent = gamma.toFixed(1);
        
        // محاسبه گرانش
        const alphaRad = (alpha * Math.PI) / 180;
        const betaRad = (beta * Math.PI) / 180;
        const gammaRad = (gamma * Math.PI) / 180;
        
        const gravityStrength = 30;
        const sensitivity = 0.8;
        const betaSensitivity = betaRad * sensitivity;
        const gammaSensitivity = gammaRad * sensitivity;
        
        const gravityX = Math.sin(betaSensitivity) * gravityStrength; // جلو-عقب
        const gravityY = -gravityStrength; // همیشه پایین
        const gravityZ = Math.sin(gammaSensitivity) * gravityStrength; // چپ-راست
        
        // اعمال گرانش
        if (physicsWorld) {
          physicsWorld.setGravity(new Ammo.btVector3(gravityX, gravityY, gravityZ));
          updateGravityArrow(gravityX, gravityY, gravityZ);
        }
        
        // نمایش اعداد گرانش
        const gravityXElement = document.getElementById('gravityX');
        const gravityYElement = document.getElementById('gravityY');
        const gravityZElement = document.getElementById('gravityZ');
        
        if (gravityXElement) gravityXElement.textContent = gravityX.toFixed(1);
        if (gravityYElement) gravityYElement.textContent = gravityY.toFixed(1);
        if (gravityZElement) gravityZElement.textContent = gravityZ.toFixed(1);
      };
      
      // اجرای شبیه‌سازی هر 100 میلی‌ثانیه
      setInterval(simulateData, 100);
      
      console.log('شبیه‌سازی ژیروسکوپ فعال شد');
    }

    // تابع غیرفعال‌سازی ژیروسکوپ
    function disableGyroscope() {
      gyroEnabled = false;
      window.removeEventListener('deviceorientation', handleGyroData, false);
      window.removeEventListener('devicemotion', handleMotionData, false);
      console.log('ژیروسکوپ غیرفعال شد');
    }

    // تابع پردازش داده‌های ژیروسکوپ (تغییر گرانش)
    function handleGyroData(event) {
      if (!gyroEnabled || !physicsWorld) return;

      // دریافت داده‌های ژیروسکوپ
      const alpha = event.alpha; // چرخش حول محور Z (0-360)
      const beta = event.beta;   // چرخش حول محور X (-180 تا 180)
      const gamma = event.gamma; // چرخش حول محور Y (-90 تا 90)

      // نمایش اعداد ژیروسکوپ روی صفحه
      const alphaElement = document.getElementById('alphaValue');
      const betaElement = document.getElementById('betaValue');
      const gammaElement = document.getElementById('gammaValue');
      
      if (alphaElement) alphaElement.textContent = alpha ? alpha.toFixed(1) : 'null';
      if (betaElement) betaElement.textContent = beta ? beta.toFixed(1) : 'null';
      if (gammaElement) gammaElement.textContent = gamma ? gamma.toFixed(1) : 'null';

      // بررسی وجود داده‌ها
      if (alpha === null || beta === null || gamma === null) return;

      // تبدیل درجه به رادیان
      const alphaRad = (alpha * Math.PI) / 180;
      const betaRad = (beta * Math.PI) / 180;
      const gammaRad = (gamma * Math.PI) / 180;

      // محاسبه جهت گرانش بر اساس ژیروسکوپ
      // گرانش باید در جهت عکس حرکت ژیروسکوپ باشد تا طبیعی به نظر برسد
      const gravityStrength = 30; // قدرت گرانش
      
      // محاسبه گرانش واقعی‌تر بر اساس ژیروسکوپ
      // Beta: جلو-عقب گوشی (X axis)
      // Gamma: چپ-راست گوشی (Z axis)
      // Alpha: چرخش حول محور عمودی (Y axis)
      
      // تنظیم حساسیت برای حرکت طبیعی‌تر
      const sensitivity = 0.8; // کاهش حساسیت
      const betaSensitivity = betaRad * sensitivity;
      const gammaSensitivity = gammaRad * sensitivity;
      
      const gravityX = Math.sin(betaSensitivity) * gravityStrength; // جلو-عقب
      const gravityY = -gravityStrength; // همیشه پایین
      const gravityZ = Math.sin(gammaSensitivity) * gravityStrength; // چپ-راست

      // نمایش اعداد گرانش روی صفحه
      const gravityXElement = document.getElementById('gravityX');
      const gravityYElement = document.getElementById('gravityY');
      const gravityZElement = document.getElementById('gravityZ');
      
      if (gravityXElement) gravityXElement.textContent = gravityX.toFixed(1);
      if (gravityYElement) gravityYElement.textContent = gravityY.toFixed(1);
      if (gravityZElement) gravityZElement.textContent = gravityZ.toFixed(1);

      // اعمال گرانش جدید به فیزیک
      physicsWorld.setGravity(new Ammo.btVector3(gravityX, gravityY, gravityZ));
      
      // به‌روزرسانی محور گرانش
      updateGravityArrow(gravityX, gravityY, gravityZ);
    }

    // تابع پردازش داده‌های DeviceMotion (fallback - تغییر گرانش)
    function handleMotionData(event) {
      if (!gyroEnabled || !physicsWorld) return;

      // استفاده از rotationRate برای DeviceMotionEvent
      const rotationRate = event.rotationRate;
      if (!rotationRate) return;

      // محاسبه گرانش بر اساس rotationRate
      const gravityStrength = 30;
      const gravityX = rotationRate.gamma ? rotationRate.gamma * 0.5 : 0;
      const gravityY = -gravityStrength; // گرانش پایین همیشه فعال
      const gravityZ = rotationRate.beta ? rotationRate.beta * 0.5 : 0;

      // اعمال گرانش جدید به فیزیک
      physicsWorld.setGravity(new Ammo.btVector3(gravityX, gravityY, gravityZ));
      
      console.log(`گرانش (Motion) تغییر کرد: X=${gravityX.toFixed(2)}, Y=${gravityY.toFixed(2)}, Z=${gravityZ.toFixed(2)}`);
    }

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
      // گرانش اولیه بر اساس نوع دستگاه
      if (isMobile) {
        physicsWorld.setGravity(new Ammo.btVector3(0, -30, 0)); // گرانش پایین برای موبایل
        console.log('گرانش اولیه موبایل تنظیم شد: (0, -30, 0)');
      } else {
        physicsWorld.setGravity(new Ammo.btVector3(0, 0, 0)); // گرانش صفر برای دسکتاپ
        console.log('گرانش اولیه دسکتاپ تنظیم شد: (0, 0, 0)');
      }
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
              metalness: 0.4,
              roughness: 0.5,
              clearcoat: 0.3,
              clearcoatRoughness: 0.8,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 1,
            });
            kafMeshes.push(child);
          }
        });
        scene.add(object);

        // تنظیمات نیم‌کره شفاف
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // ایجاد پیوت در مرکز KAF برای چرخش حول مرکز
        kafObject = object;
        kafPivot = new THREE.Object3D();
        kafPivot.position.copy(center);
        kafObject.position.sub(center);
        scene.add(kafPivot);
        kafPivot.add(kafObject);
        kafInitialQuat.copy(kafPivot.quaternion);

        // ساخت بدنه‌ی فیزیکی KAF به‌صورت مرکب حول مرکز
        const kafTriangleMesh = new Ammo.btTriangleMesh();
        kafMeshes.forEach((mesh) => {
          const geom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
          const vertices = geom.attributes.position.array;
          for (let i = 0; i < vertices.length; i += 9) {
            const v1 = new Ammo.btVector3(
              vertices[i],
              vertices[i + 1],
              vertices[i + 2]
            );
            const v2 = new Ammo.btVector3(
              vertices[i + 3],
              vertices[i + 4],
              vertices[i + 5]
            );
            const v3 = new Ammo.btVector3(
              vertices[i + 6],
              vertices[i + 7],
              vertices[i + 8]
            );
            kafTriangleMesh.addTriangle(v1, v2, v3, false);
          }
        });
        const kafInnerShape = new Ammo.btBvhTriangleMeshShape(
          kafTriangleMesh,
          true,
          true
        );
        const kafCompoundShape = new Ammo.btCompoundShape();
        const kafLocalTransform = new Ammo.btTransform();
        kafLocalTransform.setIdentity();
        kafLocalTransform.setOrigin(
          new Ammo.btVector3(-center.x, -center.y, -center.z)
        );
        kafCompoundShape.addChildShape(kafLocalTransform, kafInnerShape);
        const kafStartTransform = new Ammo.btTransform();
        kafStartTransform.setIdentity();
        kafStartTransform.setOrigin(
          new Ammo.btVector3(center.x, center.y, center.z)
        );
        const kafMotionState = new Ammo.btDefaultMotionState(kafStartTransform);
        const kafRbInfo = new Ammo.btRigidBodyConstructionInfo(
          0,
          kafMotionState,
          kafCompoundShape,
          new Ammo.btVector3(0, 0, 0)
        );
        kafBody = new Ammo.btRigidBody(kafRbInfo);
        kafBody.setRestitution(0.5);
        kafBody.setFriction(0.8);
        // تبدیل به جسم کینماتیک برای امکان جابه‌جایی دستی
        kafBody.setCollisionFlags(kafBody.getCollisionFlags() | 2);
        kafBody.setActivationState(4);
        physicsWorld.addRigidBody(kafBody);

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
          opacity: 0.25,
          roughness: 0.35,
          metalness: 0.95,
          clearcoat: 0.1,
          clearcoatRoughness: 0.9,
          side: THREE.DoubleSide,
          envMapIntensity: 0.5
        });
        const hemisphere = new THREE.Mesh(
          hemisphereGeometry,
          hemisphereMaterial
        );
        hemisphere.position.set(0, size.y - 5 - center.y, 0);
        hemisphere.castShadow = false;
        hemisphere.receiveShadow = true;
        kafPivot.add(hemisphere);
        // برای انتخاب با ری‌کستر هم قابل کلیک باشد
        kafMeshes.push(hemisphere);

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
              hemisphereRadius * Math.sin(theta) * Math.cos(phi),
              hemisphereRadius * Math.cos(theta) + (size.y - 5 - center.y),
              hemisphereRadius * Math.sin(theta) * Math.sin(phi)
            );
            const v2 = new Ammo.btVector3(
              hemisphereRadius * Math.sin(theta) * Math.cos(phi + phiLength / segments),
              hemisphereRadius * Math.cos(theta) + (size.y - 5 - center.y),
              hemisphereRadius * Math.sin(theta) * Math.sin(phi + phiLength / segments)
            );
            const v3 = new Ammo.btVector3(
              hemisphereRadius * Math.sin(theta + thetaLength / segments) * Math.cos(phi),
              hemisphereRadius * Math.cos(theta + thetaLength / segments) + (size.y - 5 - center.y),
              hemisphereRadius * Math.sin(theta + thetaLength / segments) * Math.sin(phi)
            );
            triangleMesh.addTriangle(v1, v2, v3, false);
          }
        }

        const hemisphereShape = new Ammo.btBvhTriangleMeshShape(
          triangleMesh,
          true,
          true
        );
        const hemisphereLocalTransform = new Ammo.btTransform();
        hemisphereLocalTransform.setIdentity();
        kafCompoundShape.addChildShape(hemisphereLocalTransform, hemisphereShape);

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
          center.y + cameraZ * 1.2,
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

        // تشخیص موبایل
        detectMobile();

        // ایجاد محور گرانش
        createGravityArrow();

        // اضافه کردن دکمه ژیروسکوپ (فقط در موبایل)
        addGyroButton();

        // بررسی پشتیبانی از ژیروسکوپ و فعال‌سازی خودکار در موبایل
        if (checkGyroSupport()) {
          console.log('ژیروسکوپ پشتیبانی می‌شود');
          if (isMobile) {
            showGyroInstructions();
            // فعال‌سازی خودکار ژیروسکوپ در موبایل
            setTimeout(() => {
              autoEnableGyroscope();
            }, 2000);
            
            // تست جایگزین برای فعال‌سازی ژیروسکوپ
            setTimeout(() => {
              console.log('تست جایگزین فعال‌سازی ژیروسکوپ...');
              if (typeof DeviceOrientationEvent !== 'undefined') {
                console.log('سعی در فعال‌سازی مستقیم ژیروسکوپ...');
                gyroEnabled = true;
                window.addEventListener('deviceorientation', handleGyroData, false);
                console.log('ژیروسکوپ به صورت مستقیم فعال شد');
              }
            }, 5000);
            
            // شبیه‌سازی ژیروسکوپ برای HTTP
            if (location.protocol === 'http:') {
              console.log('شبیه‌سازی ژیروسکوپ برای HTTP...');
              setTimeout(() => {
                simulateGyroscope();
              }, 3000);
            }
          }
        } else {
          console.log('ژیروسکوپ پشتیبانی نمی‌شود');
        }

        // اضافه کردن debug برای موبایل
        console.log('User Agent:', navigator.userAgent);
        console.log('Protocol:', location.protocol);
        console.log('Hostname:', location.hostname);
        console.log('Touch support:', 'ontouchstart' in window);
        console.log('Device Orientation support:', typeof DeviceOrientationEvent !== 'undefined');
        console.log('Device Motion support:', typeof DeviceMotionEvent !== 'undefined');
        console.log('isMobile:', isMobile);
        console.log('gyroEnabled:', gyroEnabled);
        
        // نمایش وضعیت کامل روی صفحه (همیشه)
        const statusDiv = document.createElement('div');
        statusDiv.id = 'fullStatus';
        statusDiv.style.cssText = `
          position: fixed;
          top: 10px;
          left: 10px;
          z-index: 1002;
          padding: 15px;
          background: rgba(0,0,0,0.9);
          color: white;
          border-radius: 8px;
          font-family: 'Vazirmatn', sans-serif;
          font-size: 12px;
          max-width: 300px;
          max-height: 80vh;
          overflow-y: auto;
        `;
        
        // بررسی HTTP و نمایش هشدار
        const isHttp = location.protocol === 'http:';
        const httpWarning = isHttp ? '<div style="color: #ff6b6b; font-weight: bold;">⚠️ HTTP: ژیروسکوپ کار نمی‌کند!</div>' : '';
        
        statusDiv.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 10px;">🔍 وضعیت سیستم</div>
          ${httpWarning}
          <div>موبایل: <span id="mobileStatus">${isMobile ? 'بله' : 'خیر'}</span></div>
          <div>پشتیبانی ژیروسکوپ: <span id="gyroSupportStatus">${checkGyroSupport() ? 'بله' : 'خیر'}</span></div>
          <div>ژیروسکوپ فعال: <span id="gyroEnabledStatus">${gyroEnabled ? 'بله' : 'خیر'}</span></div>
          <div>User Agent: <span id="userAgentStatus">${navigator.userAgent.substring(0, 50)}...</span></div>
          <div>Protocol: <span id="protocolStatus" style="color: ${isHttp ? '#ff6b6b' : '#4CAF50'}">${location.protocol}</span></div>
          <div>Touch Support: <span id="touchStatus">${'ontouchstart' in window ? 'بله' : 'خیر'}</span></div>
          <div style="margin-top: 10px; font-weight: bold;">📱 داده‌های ژیروسکوپ:</div>
          <div>Alpha: <span id="alphaValue">-</span></div>
          <div>Beta: <span id="betaValue">-</span></div>
          <div>Gamma: <span id="gammaValue">-</span></div>
          <div style="margin-top: 10px; font-weight: bold;">🌍 گرانش:</div>
          <div>X: <span id="gravityX">0</span></div>
          <div>Y: <span id="gravityY">0</span></div>
          <div>Z: <span id="gravityZ">0</span></div>
          <div style="margin-top: 10px; font-weight: bold;">🔧 تست‌ها:</div>
          <div>محور گرانش: <span id="arrowStatus">نامشخص</span></div>
        `;
        document.body.appendChild(statusDiv);
        
        // به‌روزرسانی وضعیت
        setInterval(() => {
          const elements = {
            mobileStatus: isMobile ? 'بله' : 'خیر',
            gyroSupportStatus: checkGyroSupport() ? 'بله' : 'خیر',
            gyroEnabledStatus: gyroEnabled ? 'بله' : 'خیر'
          };
          
          Object.keys(elements).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
              element.textContent = elements[key];
              if (key === 'gyroEnabledStatus') {
                element.style.color = gyroEnabled ? '#4CAF50' : '#f44336';
              }
            }
          });
        }, 1000);

        // اضافه کردن دکمه مخفی کردن debug
        const hideDebugButton = document.createElement('button');
        hideDebugButton.textContent = 'مخفی کردن Debug';
        hideDebugButton.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 1003;
          padding: 8px 12px;
          background: #333;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Vazirmatn', sans-serif;
          font-size: 11px;
          touch-action: manipulation;
        `;
        
        hideDebugButton.addEventListener('click', () => {
          const statusDiv = document.getElementById('fullStatus');
          if (statusDiv) {
            const isHidden = statusDiv.style.display === 'none';
            statusDiv.style.display = isHidden ? 'block' : 'none';
            hideDebugButton.textContent = isHidden ? 'مخفی کردن Debug' : 'نمایش Debug';
            console.log('Debug visibility toggled:', !isHidden);
          } else {
            console.log('statusDiv not found!');
          }
        });
        
        document.body.appendChild(hideDebugButton);
        
        // تست اولیه ژیروسکوپ
        if (typeof DeviceOrientationEvent !== 'undefined') {
          console.log('DeviceOrientationEvent در دسترس است');
          // تست ساده برای بررسی عملکرد
          const testHandler = (event) => {
            console.log('تست ژیروسکوپ موفق:', event.alpha, event.beta, event.gamma);
            window.removeEventListener('deviceorientation', testHandler);
          };
          window.addEventListener('deviceorientation', testHandler, false);
          
          // حذف تست بعد از 3 ثانیه
          setTimeout(() => {
            window.removeEventListener('deviceorientation', testHandler);
          }, 3000);
        }

        // تست دستی ژیروسکوپ برای موبایل
        if (isMobile) {
          console.log('شروع تست دستی ژیروسکوپ...');
          setTimeout(() => {
            console.log('تست فعال‌سازی دستی ژیروسکوپ...');
            const testHandler = (event) => {
              console.log('تست دستی ژیروسکوپ:', event.alpha, event.beta, event.gamma);
            };
            window.addEventListener('deviceorientation', testHandler, false);
            
            // حذف تست بعد از 5 ثانیه
            setTimeout(() => {
              window.removeEventListener('deviceorientation', testHandler);
            }, 5000);
          }, 3000);
        }

        // رویدادهای ماوس/لمس برای چرخش KAF حول مرکز
        renderer.domElement.addEventListener("mousedown", onMouseDown, false);
        window.addEventListener("mousemove", onMouseMove, false);
        window.addEventListener("mouseup", onMouseUp, false);
        window.addEventListener("mouseleave", onMouseUp, false);
        renderer.domElement.addEventListener("touchstart", onMouseDown, { passive: false });
        window.addEventListener("touchmove", onMouseMove, { passive: false });
        window.addEventListener("touchend", onMouseUp, false);
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
        const force = 100;
        const angle = Math.random() * Math.PI * 3;
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
    const throwButton = document.getElementById("throwButton");
    if (throwButton) {
      // رویداد کلیک
      throwButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("دکمه پرتاب کلیک شد");
        throwBalls();
      });
      
      // رویدادهای لمسی برای موبایل
      throwButton.addEventListener("touchstart", function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("دکمه پرتاب لمس شد");
        throwBalls();
      }, { passive: false });

      // رویداد touchend به عنوان fallback
      throwButton.addEventListener("touchend", function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("دکمه پرتاب لمس تمام شد");
        throwBalls();
      }, { passive: false });

      // اضافه کردن mousedown به عنوان fallback اضافی
      throwButton.addEventListener("mousedown", function (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("دکمه پرتاب mousedown");
        throwBalls();
      });
    } else {
      console.error("دکمه پرتاب پیدا نشد!");
    }

    // اضافه کردن دکمه ژیروسکوپ به HTML (فقط در موبایل)
    function addGyroButton() {
      // فقط در موبایل دکمه نمایش داده شود
      if (!isMobile) {
        console.log('دکمه ژیروسکوپ در دسکتاپ نمایش داده نمی‌شود');
        return;
      }

      const gyroButton = document.createElement('button');
      gyroButton.id = 'gyroButton';
      gyroButton.textContent = 'فعال‌سازی ژیروسکوپ';
      gyroButton.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        z-index: 1002;
        padding: 10px 15px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Vazirmatn', sans-serif;
        font-size: 12px;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        min-height: 44px;
      `;
      
      const handleGyroButtonClick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log("دکمه ژیروسکوپ کلیک شد");
        
        if (!gyroEnabled) {
          const success = await enableGyroscope();
          if (success) {
            gyroButton.textContent = 'غیرفعال‌سازی ژیروسکوپ';
            gyroButton.style.background = '#f44336';
          }
        } else {
          disableGyroscope();
          gyroButton.textContent = 'فعال‌سازی ژیروسکوپ';
          gyroButton.style.background = '#4CAF50';
        }
      };

      gyroButton.addEventListener('click', handleGyroButtonClick);
      gyroButton.addEventListener('touchstart', handleGyroButtonClick, { passive: false });
      
      // اضافه کردن دکمه تست گرانش
      const testGravityButton = document.createElement('button');
      testGravityButton.textContent = 'تست گرانش';
      testGravityButton.style.cssText = `
        position: fixed;
        top: 110px;
        right: 10px;
        z-index: 1002;
        padding: 10px 15px;
        background: #ff9800;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Vazirmatn', sans-serif;
        font-size: 12px;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        min-height: 44px;
      `;
      
      testGravityButton.addEventListener('click', () => {
        console.log('تست گرانش کلیک شد');
        if (physicsWorld) {
          // تست گرانش در جهت‌های مختلف
          const testGravity = (x, y, z, label) => {
            physicsWorld.setGravity(new Ammo.btVector3(x, y, z));
            updateGravityArrow(x, y, z);
            
            // نمایش اعداد گرانش
            const gravityXElement = document.getElementById('gravityX');
            const gravityYElement = document.getElementById('gravityY');
            const gravityZElement = document.getElementById('gravityZ');
            
            if (gravityXElement) gravityXElement.textContent = x.toFixed(1);
            if (gravityYElement) gravityYElement.textContent = y.toFixed(1);
            if (gravityZElement) gravityZElement.textContent = z.toFixed(1);
            
            console.log(`گرانش تست ${label}: X=${x}, Y=${y}, Z=${z}`);
          };

          // تست فوری برای بررسی عملکرد
          testGravity(0, -30, 0, 'پایین');
          
          setTimeout(() => {
            testGravity(30, 0, 0, 'راست');
          }, 1000);
          
          setTimeout(() => {
            testGravity(-30, 0, 0, 'چپ');
          }, 2000);
          
          setTimeout(() => {
            testGravity(0, 0, 30, 'جلو');
          }, 3000);
          
          setTimeout(() => {
            testGravity(0, -30, 0, 'حالت عادی');
          }, 4000);
        } else {
          console.log('physicsWorld موجود نیست!');
          alert('سیستم فیزیک آماده نیست!');
        }
      });
      
      // اضافه کردن دکمه تست HTTP
      const httpTestButton = document.createElement('button');
      httpTestButton.textContent = 'تست HTTP';
      httpTestButton.style.cssText = `
        position: fixed;
        top: 160px;
        right: 10px;
        z-index: 1002;
        padding: 10px 15px;
        background: #9c27b0;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Vazirmatn', sans-serif;
        font-size: 12px;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        min-height: 44px;
      `;
      
      httpTestButton.addEventListener('click', () => {
        console.log('تست HTTP کلیک شد');
        alert(`Protocol: ${location.protocol}\nHTTPS مورد نیاز برای ژیروسکوپ!`);
        
        // تست دستی گرانش
        if (physicsWorld) {
          physicsWorld.setGravity(new Ammo.btVector3(0, -30, 0));
          updateGravityArrow(0, -30, 0);
          
          // نمایش اعداد
          const gravityXElement = document.getElementById('gravityX');
          const gravityYElement = document.getElementById('gravityY');
          const gravityZElement = document.getElementById('gravityZ');
          
          if (gravityXElement) gravityXElement.textContent = '0.0';
          if (gravityYElement) gravityYElement.textContent = '-30.0';
          if (gravityZElement) gravityZElement.textContent = '0.0';
        }
      });
      
      // اضافه کردن دکمه تنظیم حساسیت
      const sensitivityButton = document.createElement('button');
      sensitivityButton.textContent = 'حساسیت';
      sensitivityButton.style.cssText = `
        position: fixed;
        top: 210px;
        right: 10px;
        z-index: 1002;
        padding: 10px 15px;
        background: #ff5722;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Vazirmatn', sans-serif;
        font-size: 12px;
        touch-action: manipulation;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        min-height: 44px;
      `;
      
      let currentSensitivity = 0.8;
      sensitivityButton.addEventListener('click', () => {
        currentSensitivity = currentSensitivity === 0.8 ? 1.2 : 0.8;
        sensitivityButton.textContent = `حساسیت: ${currentSensitivity}`;
        console.log('حساسیت تغییر کرد به:', currentSensitivity);
      });
      
      document.body.appendChild(gyroButton);
      document.body.appendChild(testGravityButton);
      document.body.appendChild(httpTestButton);
      document.body.appendChild(sensitivityButton);
      console.log('دکمه‌های ژیروسکوپ در موبایل اضافه شد');
    }

    // حذف کنترل حساسیت - حساسیت ثابت و بالا
    // gyroSensitivity = 0.05 (ثابت)

    // نمایش راهنمای ژیروسکوپ (فقط در موبایل)
    function showGyroInstructions() {
      if (!isMobile) return;
      
      const instructions = document.createElement('div');
      instructions.id = 'gyroInstructions';
      instructions.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: 'Vazirmatn', sans-serif;
        font-size: 12px;
        text-align: center;
        z-index: 1000;
        display: none;
      `;
      instructions.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">🎮 راهنمای ژیروسکوپ</div>
        <div>ژیروسکوپ به صورت خودکار فعال است!</div>
        <div>گوشی را به چپ و راست بچرخانید</div>
        <div>گرانش تغییر می‌کند و توپ‌ها حرکت می‌کنند</div>
        <div style="margin-top: 10px; font-size: 10px; opacity: 0.8;">
          💡 چرخش KAF با لمس غیرفعال است
        </div>
      `;
      
      document.body.appendChild(instructions);
      
      // نمایش راهنما برای 3 ثانیه
      setTimeout(() => {
        instructions.style.display = 'block';
        setTimeout(() => {
          instructions.style.opacity = '0';
          setTimeout(() => {
            if (instructions.parentNode) {
              instructions.parentNode.removeChild(instructions);
            }
          }, 500);
        }, 3000);
      }, 1000);
    }

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

      // انیمیشن بازگشت نرم به وضعیت اولیه پس از رها کردن موس (فقط در دسکتاپ)
      if (!isMobile && !isRotatingKaf && !gyroEnabled && isReturning && kafPivot) {
        const now = performance.now();
        const t = Math.min((now - returnStartTime) / (returnDuration * 1000), 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        THREE.Quaternion.slerp(returnStartQuat, kafInitialQuat, kafPivot.quaternion, eased);

        if (kafBody) {
          const transform = new Ammo.btTransform();
          transform.setIdentity();
          transform.setOrigin(new Ammo.btVector3(kafPivot.position.x, kafPivot.position.y, kafPivot.position.z));
          const q = kafPivot.quaternion;
          transform.setRotation(new Ammo.btQuaternion(q.x, q.y, q.z, q.w));
          kafBody.setWorldTransform(transform);
          const motionState = kafBody.getMotionState();
          if (motionState) motionState.setWorldTransform(transform);
        }

        if (t >= 1) {
          isReturning = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    }

    // تشخیص موبایل قبل از تنظیم فیزیک
    detectMobile();
    
    initPhysics();
    animate();

    window.addEventListener("resize", onWindowResize, false);
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    }

    // توابع کمکی برای چرخش KAF با ماوس/لمس
    function getClientXY(e) {
      if (e && e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      if (e && e.changedTouches && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function getIntersections(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      const { x, y } = getClientXY(event);
      mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(kafMeshes, true);
    }

    function onMouseDown(event) {
      if (event && event.cancelable) event.preventDefault();
      if (!isSceneReady || !kafMeshes.length) return;
      
      // چرخش KAF فقط در دسکتاپ فعال باشد
      if (isMobile) return;
      
      const intersects = getIntersections(event);
      if (intersects && intersects.length > 0) {
        isRotatingKaf = true;
        const { x, y } = getClientXY(event);
        lastMouse.set(x, y);
        isReturning = false;
      }
    }

    function onMouseMove(event) {
      if (event && event.cancelable) event.preventDefault();
      if (!isRotatingKaf || !kafPivot) return;
      if (isReturning) isReturning = false;
      const { x, y } = getClientXY(event);
      const deltaX = x - lastMouse.x;
      const deltaY = y - lastMouse.y;
      lastMouse.set(x, y);

      // چرخش حول محورهای Y و X نسبت به مرکز
      kafPivot.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaX * rotationSpeed);
      kafPivot.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), deltaY * rotationSpeed);

      // اعمال وضعیت به بدنه فیزیکی (جرم 0)
      if (kafBody) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(kafPivot.position.x, kafPivot.position.y, kafPivot.position.z));
        const quat = kafPivot.quaternion;
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        kafBody.setWorldTransform(transform);
        const motionState = kafBody.getMotionState();
        if (motionState) motionState.setWorldTransform(transform);
      }
    }

    function onMouseUp(event) {
      if (event && event.cancelable) event.preventDefault();
      isRotatingKaf = false;
      if (kafPivot) {
        returnStartQuat.copy(kafPivot.quaternion);
        returnStartTime = performance.now();
        isReturning = true;
      }
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
