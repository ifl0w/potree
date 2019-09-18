new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data: {
        hideOverlay: true,
        sheet: false,

        firstPersonControls: true,

        refreshRate: 10, // hz
        updateTimer: null,

        pointBudget: 10000000,
        poolSize: 25000000,
        poolSizeMB: 0,
        pointsPerFrame: 1000000,
        maxNodesPerFrame: 0,

        pointSize: 2,

        // performance data
        fps: 60,
        memoryUtilization: 60,
        numUploadedNodes: 0,
    },
    mounted() {
        window.viewer.setPointBudget(this.pointBudget);
    },
    created() {
        this.$vuetify.theme.dark = true;
        this.updateTimer = setInterval(() => {
            if (!window.viewer) return;

            this.fps = window.viewer.pRenderer.getFPS();
            this.memoryUtilization = window.viewer.pRenderer.getMemoryUtilization();
            this.numUploadedNodes = window.viewer.pRenderer.numNodesUploaded;
        }, (1 / this.refreshRate) * 1000);

        this.updatePointBudget();
        this.updatePointsPerFrame();
        this.updateMaxNodesPerFrame();
        this.poolSizeMB = window.viewer.pRenderer.pointPoolSizeInMB;
        this.poolSize = window.viewer.pRenderer.pointPoolSize;
    },
    methods: {
        updatePointBudget() {
            window.viewer.setPointBudget(this.pointBudget);
        },
        updatePoolSize() {
            window.viewer.pRenderer.pointPoolSize = this.poolSize;
            this.poolSizeMB = window.viewer.pRenderer.pointPoolSizeInMB;
        },
        updatePointsPerFrame() {
            window.viewer.pRenderer.pointsPerFrame = this.pointsPerFrame;
        },
        updateMaxNodesPerFrame() {
            window.viewer.pRenderer.maxNodesPerFrame = this.maxNodesPerFrame;
        },
        clearFrame() {
            window.viewer.pRenderer.clearFrame();
        },
        clearPool() {
            window.viewer.pRenderer.clearPool();
        },
        clearAll() {
            window.viewer.pRenderer.clearAll();
        },
        switchControls() {
            if (this.firstPersonControls) {
                window.viewer.setNavigationMode(Potree.OrbitControls);
            } else {
                window.viewer.setNavigationMode(Potree.FirstPersonControls);
            }

            this.firstPersonControls = !this.firstPersonControls;
            this.resetView();
        },
        resetView() {
            window.viewer.scene.view.position.set(694991.9150582966, 3916274.3733733483, 76.41774609890476);
            window.viewer.scene.view.lookAt(694878.4097257275, 3916332.0674868184, 14.497470898558227);
        },
        updatePointSize() {
            window.viewer.pRenderer.pointSize = this.pointSize;
        }
    },

    template: `<v-app xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
    <v-content>

        <v-bottom-sheet content-class="toolbox" v-model="sheet" :hide-overlay="hideOverlay" inset>
            <template v-slot:activator="{ on }">
                <v-btn class="mx-4 my-4"
                       fab dark large color="primary"
                       v-on="on"
                       style="position: absolute; right: 0; bottom: 0; z-index: 2">
                    <v-icon dark>mdi-settings</v-icon>
                </v-btn>
            </template>

            <v-sheet color="transparent">

                <v-row class="px-4">
                    <v-col cols="4">
                        <v-card class="fill-height">
                            <v-card-title>Performance</v-card-title>

                            <v-list-item two-line>
                                <v-list-item-content>
                                    <v-list-item-title>{{fps}} FPS</v-list-item-title>
                                    <v-list-item-subtitle>Number of frames per second</v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>

                            <v-list-item two-line>
                                <v-list-item-content>
                                    <v-list-item-title>-</v-list-item-title>
                                    <v-list-item-subtitle>Time needed for re-projection</v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>

                            <v-list-item two-line>
                                <v-list-item-content>
                                    <v-list-item-title>-</v-list-item-title>
                                    <v-list-item-subtitle>Time needed for rendering new points</v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>

                            <v-list-item two-line>
                                <v-list-item-content>
                                    <v-list-item-title>-</v-list-item-title>
                                    <v-list-item-subtitle>Time needed for combining the results</v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>
                        </v-card>
                    </v-col>

                    <v-col cols="8">
                        <v-card class="fill-height">
                            <v-card-title> Settings</v-card-title>

                            <v-card-text>
                                <div>Point Budget</div>
                                <v-slider
                                        v-model="pointBudget"
                                        step="10000"
                                        min="100000"
                                        max="20000000"
                                        :label="pointBudget.toLocaleString()"
                                        v-on:change="updatePointBudget">
                                    <template v-slot:append>
                                        <v-text-field
                                                v-model="pointBudget"
                                                class="mt-0 pt-0"
                                                hide-details
                                                single-line
                                                type="number"
                                                v-on:change="updatePointBudget"
                                        />
                                    </template>
                                </v-slider>

                                <div>Pool Size ({{poolSizeMB.toLocaleString()}}MB)</div>
                                <v-slider
                                        v-model="poolSize"
                                        step="10000"
                                        min="100000"
                                        max="100000000"
                                        persistent-hint
                                        :label="poolSize.toLocaleString()"
                                        v-on:change="updatePoolSize()">
                                    <template v-slot:append>
                                        <v-text-field
                                                v-model="poolSize"
                                                class="mt-0 pt-0"
                                                hide-details
                                                single-line
                                                type="number"
                                                v-on:change="updatePoolSize()"
                                        />
                                    </template>
                                </v-slider>

                                <div>Max Nodes per Frame</div>
                                <v-slider
                                        v-model="maxNodesPerFrame"
                                        min="0"
                                        max="250"
                                        step="1"
                                        :label="maxNodesPerFrame == 0 ? 'Unlimited' : maxNodesPerFrame.toLocaleString()"
                                        v-on:change="updateMaxNodesPerFrame()">
                                    <template v-slot:append>
                                        <v-text-field
                                                v-model="maxNodesPerFrame"
                                                class="mt-0 pt-0"
                                                hide-details
                                                single-line
                                                type="number"
                                                v-on:change="updateMaxNodesPerFrame()"
                                        />
                                    </template>
                                </v-slider>

                                <div>Points Rendered per Frame</div>
                                <v-slider
                                        v-model="pointsPerFrame"
                                        step="5000"
                                        min="5000"
                                        max="50000000"
                                        :label="pointsPerFrame.toLocaleString()"
                                        v-on:change="updatePointsPerFrame()">
                                    <template v-slot:append>
                                        <v-text-field
                                                v-model="pointsPerFrame"
                                                class="mt-0 pt-0"
                                                hide-details
                                                single-line
                                                type="number"
                                                v-on:change="updatePointsPerFrame()"
                                        />
                                    </template>
                                </v-slider>

                                <div>Point Size ({{pointSize}}px)</div>
                                <v-slider
                                        v-model="pointSize"
                                        step="1"
                                        min="1"
                                        max="10"
                                        ticks="always"
                                        v-on:change="updatePointSize()"
                                />

                            </v-card-text>

                            <v-card-actions>
                                <v-btn text @click="switchControls()">
                                    <v-icon v-if="firstPersonControls" left>mdi-eye-outline</v-icon>
                                    <v-icon v-if="!firstPersonControls" left>mdi-rotate-orbit</v-icon>
                                    Swap Controls
                                </v-btn>
                            </v-card-actions>

                        </v-card>
                    </v-col>

                </v-row>
                <v-row class="px-4">
                    <v-col cols="12">
                        <v-card>
                            <v-card-title>Memory Status</v-card-title>
                            <v-row>
                                <v-col cols="3">
                                    <v-list-item two-line>
                                        <v-list-item-content>
                                            <v-list-item-title>{{numUploadedNodes}}</v-list-item-title>
                                            <v-list-item-subtitle>Number of nodes on the GPU</v-list-item-subtitle>
                                        </v-list-item-content>
                                    </v-list-item>
                                </v-col>
                            </v-row>
                            <v-progress-linear
                                    :value="memoryUtilization*100"
                                    height="40"
                                    striped>
                                <strong> {{(memoryUtilization*100).toFixed(2)}}% </strong>
                            </v-progress-linear>
                            <v-card-actions>
                                <v-btn text @click="clearFrame()">Clear Frame</v-btn>
                                <v-btn text @click="clearPool()">Clear Point Pool</v-btn>
                                <v-btn text @click="clearAll()">Clear All</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
                </v-row>
            </v-sheet>
            
        </v-bottom-sheet>
    </v-content>
</v-app>`
});
