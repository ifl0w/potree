<template>
  <v-container>

    <div id="potree_container">
      <div id="potree_render_area"></div>
    </div>


  </v-container>
</template>

<script>
export default {
  data: () => ({}),

  mounted() {
    this.viewer = new Potree.Viewer(document.getElementById("potree_render_area"), {useComputeShader: true});

    // viewer.setEDLEnabled(true);
    this.viewer.setFOV(60);
    this.viewer.setPointBudget(10 * 1000 * 1000);
    // viewer.loadSettingsFromURL();
    //
    // viewer.setDescription("");
    //
    // viewer.loadGUI(() => {
    //   viewer.setLanguage('en');
    //   $("#menu_appearance").next().show();
    //   $("#menu_tools").next().show();
    //   $("#menu_scene").next().show();
    //   viewer.toggleSidebar();
    // });

    // Sigeom
    Potree.loadPointCloud("http://5.9.65.151/mschuetz/potree/resources/pointclouds/opentopography/CA13_1.4/cloud.js", "CA13", (e) => {
      this.viewer.scene.addPointCloud(e.pointcloud);
      e.pointcloud.position.z = 0;
      let material = e.pointcloud.material;
      material.size = 1;
      material.pointSizeType = Potree.PointSizeType.FIXED;

      this.viewer.scene.view.position.set(694991.9150582966, 3916274.3733733483, 76.41774609890476);
      this.viewer.scene.view.lookAt(694878.4097257275, 3916332.0674868184, 14.497470898558227);
    });
  },

  beforeDestroy() {
    console.log(this.viewer)
  }
};
</script>

<style scoped>
  #potree_container{
    position: absolute;
    width: 100vw;
    height: 100vh;
    left: 0;
    top: 0;
  }

  #potree_render_area {
    width: 100vw;
    height: 100vh;
  }
</style>
