const cityModel = require("../models/cities");
const KartennGenerator = require('../../../config/generator')
const AsyncLock = require('async-lock');
var lock = new AsyncLock();
var waitList = [];

module.exports = {
  getById: function (req, res, next) {
    console.log(req.body);
    cityModel.findById(req.params.cityId, function (err, cityInfo) {
      if (err) {
        next(err);
      } else {
        res.json({
          status: "success",
          message: "City found!!!",
          data: { cities: cityInfo },
        });
      }
    });
  },
  getByName: async function (req, res, next) {
    console.log(req.params);
    console.log(req.query);
    await cityModel.findOne({ "name": req.params.cityName }, async function (err, cityInfo) {
      if (err) {
        next(err);
      } else {
        console.log(cityInfo);
        if (!cityInfo) {
          if (req.query.create == 'true') {
            lock.acquire("generateCity", function (done) {
              if (!(req.params.cityName in waitList)) {
                waitList[req.params.cityName] = new Date().now();
              } else {
                if (waitList[req.params.cityName] + 600000 > new Date().now()) {
                  delete waitList[req.params.cityName];

                  res.status(500).json({
                    status: "error",
                    message: "Failed to create the city ..."
                  });

                  return;
                }
              }

              setTimeout(function () {
                done();
              }, 1000)
            }, function (err, ret) {
            }, {});

            let generatedCityPath = await KartennGenerator.createMap("model.xml", req.params.cityName, req.params.cityName + ".png");
            let generatedCityPreviewPath = await KartennGenerator.createPreview(req.params.cityName + ".png", req.params.cityName + "_prev.jpg")
            let generatedCityPathSimp = await KartennGenerator.createMap("model_simp.xml", req.params.cityName, req.params.cityName + "_simp.png");
            let generatedCityPreviewPathSimp = await KartennGenerator.createPreview(req.params.cityName + "_simp.png", req.params.cityName + "_simp_prev.jpg")

            if (!generatedCityPath || !generatedCityPathSimp) {
              res.status(500).json({
                status: "error",
                message: "Failed to create the city ..."
              });
            } else {
              cityModel.create(
                { name: req.params.cityName, file: generatedCityPath, thumb: generatedCityPreviewPath, file_simp: generatedCityPathSimp, thumb_simp: generatedCityPreviewPathSimp },
                function (err, result) {
                  if (err) {
                    next(err);
                  } else {
                    res.status(201).json({
                      status: "success",
                      message: "city added successfully!!!",
                      data: { name: req.params.cityName, file: generatedCityPath, thumb: generatedCityPreviewPath, file_simp: generatedCityPathSimp, thumb_simp: generatedCityPreviewPathSimp }
                    });
                  }
                }
              );
            }

            lock.acquire("generateCity", function (done) {
              if (req.params.cityName in waitList) {
                delete waitList[req.params.cityName];
              }

              setTimeout(function () {
                done();
              }, 1000)
            }, function (err, ret) {
            }, {});
          } else {
            res.status(404).json({
              status: "error",
              message: "City isn't generated ..."
            });
          }
        } else {
          res.status(200).json({
            status: "success",
            message: "city found !!!",
            data: { name: cityInfo.cityName, file: cityInfo.file, file_simp: cityInfo.file_simp, thumb: cityInfo.thumb, thumb_simp: cityInfo.thumb_simp }
          });
        }
      }
    });
  },
  getAll: function (req, res, next) {
    let citiesList = [];
    cityModel.find({}, function (err, cities) {
      if (err) {
        next(err);
      } else {
        for (let city of cities) {
          citiesList.push({
            id: city._id,
            name: city.name,
            file: city.file,
            file_simp: city.file_simp,
            thumb: city.thumb,
            thumb_simp: city.thumb_simp
          });
        }
        res.status(200).json({
          status: "success",
          message: "Cities list found!!!",
          data: { cities: citiesList },
        });
      }
    });
  },
  updateById: function (req, res, next) {
    cityModel.findByIdAndUpdate(
      req.params.cityId,
      { name: req.body.name, file: req.body.file, file_simp: req.body.file_simp, thumb: req.body.thumb, thumb_simp: req.body.thumb_simp },
      function (err, cityInfo) {
        if (err) next(err);
        else {
          res.json({
            status: "success",
            message: "city updated successfully!!!",
            data: null,
          });
        }
      }
    );
  },
  deleteById: function (req, res, next) {
    cityModel.findByIdAndRemove(req.params.cityId, function (err, cityInfo) {
      if (err) next(err);
      else {
        res.json({
          status: "success",
          message: "city deleted successfully!!!",
          data: null,
        });
      }
    });
  },
  create: function (req, res, next) {
    cityModel.create(
      { name: req.body.name, file: req.body.file, file_simp: req.body.file_simp, thumb: req.body.thumb, thumb_simp: req.body.thumb_simp },
      function (err, result) {
        if (err) next(err);
        else
          res.json({
            status: "success",
            message: "city added successfully!!!",
            data: null,
          });
      }
    );
  },
};
