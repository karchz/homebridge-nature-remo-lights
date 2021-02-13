const request = require('request-promise-native');
const fs = require('fs');

let Service, Characteristic;

const BASE_URL = 'https://api.nature.global';
const TMP_DIR = '/tmp/nature-remo-lights-ext';

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory(
    'homebridge-nature-remo-lights',
    'NatureRemoLightDevice',
    NatureRemoLightDevice
  );
};

class NatureRemoLightDevice {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.read = this.read.bind(this);
    this.write = this.write.bind(this);

    if (api) {
      this.api = api;
      this.api.on('didFinishLaunching', () => {
        this.log('DidFinishLaunching');
      });
    }
  }

  getServices() {
    const informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, 'Nature, Inc.')
      .setCharacteristic(Characteristic.Model, 'NatureRemo')
      .setCharacteristic(Characteristic.SerialNumber, 'nature-remo');

    const lightBulb = new Service.Lightbulb(this.config.name);
    lightBulb
      .getCharacteristic(Characteristic.On)
      .on('get', this.getOnCharacteristicHandler.bind(this))
      .on('set', this.setOnCharacteristicHandler.bind(this));

    return [informationService, lightBulb];
  }

  async getOnCharacteristicHandler(callback) {
    let state = false;
    state = await this.read()
    callback(null, state);
  }

  async check(filePath) {
    var isExist = false;
    try {
      fs.statSync(filePath);
      isExist = true;
    } catch(err) {
      isExist = false;
    }
    return isExist;
  }

  async read(){
    var content = new String();
    var filePath = TMP_DIR+'/'+this.config.id;
    if(this.check(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
      return content == 'on';
    }
    return false;
  };

  async write(stream){
    var result = false;
    var filePath = TMP_DIR+'/'+this.config.id;
    try {
      if(!this.check(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR)
      }
      fs.writeFileSync(TMP_DIR+'/'+this.config.id, stream);
      return true;
    } catch(err) {
      console.log(err);
      return false;
    }
  }

  async setOnCharacteristicHandler(value, callback) {
    let signal = value ? this.config.on : this.config.off
    const options = {
      method: 'POST',
      url: `${BASE_URL}/1/signals/${signal}/send`,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    };
    this.write(value?'on':'off')
    await request(options);
    callback(null);
  }
}
