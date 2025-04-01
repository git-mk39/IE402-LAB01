require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
], function (esriConfig, Map, MapView, SceneView, Graphic, GraphicsLayer) {
  const map = new Map({
    basemap: "dark-gray-vector",
  });

  // biến lưu giá trị camera (độ zoom, tọa độ, góc nhìn) cho view 3D
  let cameraPosition = {
    position: { longitude: 105.5474137, latitude: 4.0241589, z: 450000 },
    tilt: 55,
  };

  // hiển thị view 2D
  const sceneView = new SceneView({
    container: null,
    map: map,
    viewingMode: "global",
    camera: cameraPosition,
  });

  // hiển thị view 3D
  const mapView = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 7,
    center: [105.5474137, 9.9241589],
  });

  // xử lý event khi chuyển đổi 2D <-> 3D
  document.getElementById("toggleBtn").addEventListener("click", function () {
    if (mapView.container) {
      // đổi sang 3D
      mapView.container = null; // xóa view
      sceneView.container = "viewDiv"; // gán view mới
      sceneView.goTo(cameraPosition, { animate: false });
      this.innerText = "Đổi sang 2D";
    } else {
      //đổi sang 2D
      cameraPosition = sceneView.camera.clone();
      sceneView.container = null;
      mapView.container = "viewDiv";
      this.innerText = "Đổi sang 3D";
    }
  });

  // đổi basemap qua danh sách
  window.changeBasemap = function (basemap) {
    map.basemap = basemap;
  };

  // phân lớp đa giác
  const polygonsLayer = new GraphicsLayer();
  // phân lớp cung
  const arcsLayer = new GraphicsLayer();
  // phân lớp điểm
  const pointsLayer = new GraphicsLayer();

  // vẽ đa giác tỉnh
  const drawProvince = (data, useDataColors) => {
    return new Graphic({
      geometry: { type: "polygon", rings: data.rings },
      symbol: {
        type: "simple-fill",
        color: useDataColors ? data.color : [120, 120, 120, 0.5],
        outline: {
          type: "simple-line",
          color: [255, 255, 255], // màu biên giới tỉnh
          width: 1, // độ dày biên giới
          style: "dash", // biên giới nét đứt
        },
      },
      attributes: data,
      popupTemplate: {
        title: "{title}",
        content: "<a>Diện tích: {area} Km²<br>Dân số: {population} người</a>",
      },
    });
  };

  // vẽ cung đường đi
  const drawRoad = (data, useDataColors) => {
    return new Graphic({
      symbol: {
        type: "simple-line",
        color: useDataColors ? data.color : [255, 180, 0],
        width: 2,
      },
      attributes: { description: data.description },
      popupTemplate: { title: "{description}" },
      geometry: { type: "polyline", paths: data.paths },
    });
  };

  // vẽ điểm thành phố
  const drawCity = (data) => {
    var img_url = "images/city.png";
    if (data.city_type === "Trực thuộc trung ương") {
      img_url = "images/major_city.png";
    }
    return new Graphic({
      symbol: {
        type: "picture-marker",
        url: img_url,
        width: "12px",
        height: "12px",
      },
      geometry: { type: "point", ...data },
      attributes: data,
      popupTemplate: {
        title: "{title}",
        content: "<a>{city_type}<br>Dân số: {population} người</a>",
      },
    });
  };

  // vẽ điểm thị trấn
  const drawTown = (data) => {
    return new Graphic({
      symbol: {
        type: "picture-marker",
        url: "images/town.png",
        width: "10px",
        height: "10px",
      },
      geometry: { type: "point", ...data },
      attributes: data,
      popupTemplate: {
        title: "{title}",
      },
    });
  };

  // vẽ điểm cầu
  const drawBridge = (data) => {
    return new Graphic({
      symbol: {
        type: "picture-marker",
        url: "images/bridge.png",
        width: "20px",
        height: "20px",
      },

      geometry: { type: "point", ...data },
      attributes: data,
      popupTemplate: {
        title: "{title}",
        content: "<a>{description}</a>",
      },
    });
  };

  // lấy dữ liệu tọa độ các tỉnh từ ./polygon/provinces/index.json
  function fetchProvinceData(useDataColors) {
    fetch("polygon/provinces/index.json")
      .then((res) => res.json())
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/provinces/${file}`).then((res) => res.json())
          )
        )
      )
      .then((data) =>
        data.forEach((obj) =>
          polygonsLayer.add(drawProvince(obj, useDataColors))
        )
      );
  }

  // fetch data tỉnh lần đầu
  fetchProvinceData(true); // thay đổi mặc định true: màu cho tỉnh khi mới tải trang, false: không màu khi mới tải

  // thực thi khi tick chọn hiển thị màu cho tỉnh
  document
    .getElementById("toggleProvinceColor")
    .addEventListener("change", function () {
      polygonsLayer.removeAll(); // xóa graphics để vẽ lại
      fetchProvinceData(this.checked);
    });

  // lấy dữ liệu các đường đi từ ./polygon/roads/index.json
  function fetchRoadData(useDataColors) {
    fetch("polygon/roads/index.json")
      .then((res) => res.json())
      .then((files) =>
        Promise.all(
          files.map((file) =>
            fetch(`polygon/roads/${file}`).then((res) => res.json())
          )
        )
      )
      .then((data) =>
        data.forEach((obj) => arcsLayer.add(drawRoad(obj, useDataColors)))
      );
  }

  // fetch data đường bộ lần đầu
  fetchRoadData(true);

  // thực thi khi tick chọn hiển thị màu cho tỉnh
  document
    .getElementById("toggleRoadColor")
    .addEventListener("change", function () {
      arcsLayer.removeAll(); // xóa graphics để vẽ lại
      fetchRoadData(this.checked);
    });

  // lấy dữ liệu các điểm cầu đường bộ từ ./point/bridges.json
  fetch("point/bridges.json")
    .then((res) => res.json())
    .then((data) => data.forEach((obj) => pointsLayer.add(drawBridge(obj))));

  // lấy dữ liệu các điểm thành phố từ ./point/cities.json
  fetch("point/cities.json")
    .then((res) => res.json())
    .then((data) => data.forEach((obj) => pointsLayer.add(drawCity(obj))));

  // lấy dữ liệu các điểm thị trấn từ ./point/cities.json
  fetch("point/towns.json")
    .then((res) => res.json())
    .then((data) => data.forEach((obj) => pointsLayer.add(drawTown(obj))));

  map.addMany([polygonsLayer, arcsLayer, pointsLayer]);
});
