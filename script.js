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

  // hiển thị view 3D
  const sceneView = new SceneView({
    container: null,
    map: map,
    viewingMode: "global",
    camera: cameraPosition,
  });

  // hiển thị view 2D
  const mapView = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 5,
    center: [108.6208828, 15.6862363],
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
  const drawProvince = (data, byRegion) => {
    let useColor;
    if (data.region === byRegion || byRegion === "Cả nước") {
      useColor = data.color;
    } else {
      useColor = [120, 120, 120, 0.5];
    }
    return new Graphic({
      geometry: { type: "polygon", rings: data.rings },
      symbol: {
        type: "simple-fill",
        color: useColor,
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
        content:
          "<a>Diện tích: {area} km²<br>Dân số: {population} người <br>Mật độ: {population_density} người/km²<br>Biển số xe: {plate_number}</a>",
      },
    });
  };

  // vẽ cung đường đi
  const drawRoad = (data, useDataColors, byRegion) => {
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
    let img_url = "images/city.png";
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

  // đặt khu vực mặc định
  const defaultRegion = "Cả nước";

  // lấy dữ liệu tọa độ các tỉnh từ ./polygon/provinces/index.json
  function fetchProvinceData(byRegion) {
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
        data.forEach((obj) => polygonsLayer.add(drawProvince(obj, byRegion)))
      );
  }

  // fetch data tỉnh lần đầu
  fetchProvinceData(defaultRegion);

  // hàm đổi khu vực hiển thị các thông tin địa lý
  window.changeDisplayRegion = function (byRegion) {
    polygonsLayer.removeAll();
    fetchProvinceData(byRegion);
  };

  // lấy dữ liệu các đường đi từ ./polygon/roads/index.json
  function fetchRoadData(useDataColors, byRegion) {
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

  // flag có dùng màu riêng cho từng đường bộ hay là không
  // mặc định = true (có)
  let useRoadColor = true;

  // fetch data đường bộ lần đầu
  fetchRoadData(useRoadColor);

  // thực thi khi tick chọn hiển thị màu cho đường
  document
    .getElementById("toggleRoadColor")
    .addEventListener("change", function () {
      arcsLayer.removeAll(); // xóa graphics để vẽ lại
      fetchRoadData(this.checked);
      useRoadColor = this.checked;
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
