/**
 * profiler that supports webgl (1) to support potree renderer
 */
class Query {
    constructor(gl, ext) {
        this.gl = gl;
        this.ext = ext;

        this.useTimestamps = false;
        this.finished = false;

        if (this.ext.getQueryEXT(this.ext.TIMESTAMP_EXT, this.ext.QUERY_COUNTER_BITS_EXT) > 0) {
            this.useTimestamps = true;
        }

        // create query
        if (this.useTimestamps) {
            this.queries = [this.ext.createQueryEXT(), this.ext.createQueryEXT()];
        } else {
            this.queries = [this.ext.createQueryEXT()];
        }

        this.start();
    }

    start() {
        // start query
        if (this.useTimestamps) {
            // startQuery = ext.createQueryEXT();
            // endQuery = ext.createQueryEXT();
            this.ext.queryCounterEXT(this.queries[0], this.ext.TIMESTAMP_EXT);
        } else {
            // timeElapsedQuery = ext.createQueryEXT();
            this.ext.beginQueryEXT(this.ext.TIME_ELAPSED_EXT, this.queries[0]);
        }
    }

    stop() {
        if (this.finished) {
            // nothing to do
            return;
        }

        if (this.useTimestamps) {
            this.ext.queryCounterEXT(entry.queries[1], this.ext.TIMESTAMP_EXT);
        } else {
            this.ext.endQueryEXT(this.ext.TIME_ELAPSED_EXT);
        }

        this.finished = true;
    }

    result() {
        if (!this.finished) {
            console.log('Query was never stopped.');
            return null;
        }

        let timeElapsed = null;

        if(!this.gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
            let available = false;


            if (this.useTimestamps) {
                available = this.ext.getQueryObjectEXT(this.queries[1], this.ext.QUERY_RESULT_AVAILABLE_EXT);
            } else {
                available = this.ext.getQueryObjectEXT(this.queries[0], this.ext.QUERY_RESULT_AVAILABLE_EXT);
            }

            if (!available) {
                return timeElapsed;
            }

            if (this.useTimestamps) {
                // See how much time the rendering of the object took in nanoseconds.
                const timeStart = this.ext.getQueryObjectEXT(this.queries[0], this.ext.QUERY_RESULT_EXT);
                const timeEnd = this.ext.getQueryObjectEXT(this.queries[1], this.ext.QUERY_RESULT_EXT);
                timeElapsed = timeEnd - timeStart;
            } else {
                timeElapsed = this.ext.getQueryObjectEXT(this.queries[0], this.ext.QUERY_RESULT_EXT);
            }

            this.finished = false;
        }

        return timeElapsed;

    }

    delete() {
        this.queries.forEach(q => this.ext.deleteQueryEXT(q));
    }
}

class Marker {
    constructor(name) {
        this.name = name;
        this.queries = [];

        this.reset();
    }

    resolveQueries() {
        const cresult = performance.now() - this.cpuTimeStamp;
        this.cmeasurements++;
        this.cpuResults.push(cresult);
        this.csum += cresult;
        this.cmin = Math.min(this.cmin, cresult);
        this.cmax = Math.max(this.cmax, cresult);

        this.queries.forEach(q => q.stop());

        this.queries.forEach((q, i) => {
            let result = q.result();
            if (result !== null) {
                this.gmeasurements++;
                this.gsum += result;
                this.gmin = Math.min(this.gmin, result);
                this.gmax = Math.max(this.gmax, result);

                this.gpuResults.push(result);

                q.delete();
                this.queries.splice(i, 1);
            }
        });
    }

    reset() {
        this.gpuResults = [];
        this.cpuResults = [];

        this.gmin = Infinity; // minimum value of current queries
        this.gmax = -Infinity; // maximum value of current queries
        this.gsum = 0; // sum of the finished query timings
        this.gmeasurements = 0;

        this.cmin = Infinity; // minimum value of current queries
        this.cmax = -Infinity; // maximum value of current queries
        this.csum = 0; // sum of the finished query timings
        this.cmeasurements = 0;
        this.lastCollect = performance.now(); // timestamp of last collect
    }

    start() {
        this.cpuTimeStamp = performance.now();
    }

    collect() {
        const gavg = this.gsum / this.gmeasurements;
        const cavg = this.csum / this.cmeasurements;
        const result = {
            gavg: (gavg / 1e6).toFixed(2),
            gmin: (this.gmin / 1e6).toFixed(2),
            gmax: (this.gmax / 1e6).toFixed(2),
            gResults: this.gpuResults,
            cavg: cavg.toFixed(2),
            cmin: this.cmin.toFixed(2),
            cmax: this.cmax.toFixed(2),
            cResults: this.cpuResults
        };
        this.reset();
        return result;
    }
}

export class LegacyProfiler {

    constructor(gl) {
        this.gl = gl;

        this.marker = new Map();

        this.ext = gl.getExtension('EXT_disjoint_timer_query');

        // Clear the disjoint state before starting to work with queries to increase
        // the chances that the results will be valid.
        gl.getParameter(this.ext.GPU_DISJOINT_EXT);

        this._fpsSamples = 0;
        this._lastFPSTimeStamp = performance.now();
    }

    create(name) {
        this.marker.set(name, new Marker(name));
    }

    start(name) {
        const marker = this.marker.get(name);
        marker.queries.push(new Query(this.gl, this.ext));
        marker.start();
    }

    stop(name) {
        const marker = this.marker.get(name);
        marker.resolveQueries();
    }

    collect(name) {
        const marker = this.marker.get(name);
        return marker.collect();
    }

    collectAll() {
        const result = {};
        this.marker.forEach((v, k) => {
            result[k] = v.collect();
        });

        return result;
    }

    newFrame() {
        this._fpsSamples++;
    }

    getFPS() {
        const avgFPS = this._fpsSamples / ((performance.now() - this._lastFPSTimeStamp) / 1000);
        this._lastFPSTimeStamp = performance.now();
        this._fpsSamples = 0;

        return avgFPS.toFixed(2);
    }

}
