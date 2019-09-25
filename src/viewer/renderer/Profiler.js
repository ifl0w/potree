class Query {
    constructor(gl, ext) {
        this.gl = gl;
        this.ext = ext;

        this.useTimestamps = false;
        this.finished = false;

        if (this.gl.getQuery(this.ext.TIMESTAMP_EXT, this.ext.QUERY_COUNTER_BITS_EXT) > 0) {
            this.useTimestamps = true;
        }

        // create query
        if (this.useTimestamps) {
            this.queries = [this.gl.createQuery(), this.gl.createQuery()];
        } else {
            this.queries = [this.gl.createQuery()];
        }

        this.start();
    }

    start() {
        // start query
        if (this.useTimestamps) {
            // startQuery = gl.createQuery();
            // endQuery = gl.createQuery();
            this.ext.queryCounterEXT(this.queries[0], this.ext.TIMESTAMP_EXT);
        } else {
            // timeElapsedQuery = gl.createQuery();
            this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.queries[0]);
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
            this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
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
                available = this.gl.getQueryParameter(this.queries[1], this.gl.QUERY_RESULT_AVAILABLE);
            } else {
                available = this.gl.getQueryParameter(this.queries[0], this.gl.QUERY_RESULT_AVAILABLE);
            }

            if (!available) {
                return timeElapsed;
            }

            if (this.useTimestamps) {
                // See how much time the rendering of the object took in nanoseconds.
                const timeStart = this.gl.getQueryParameter(this.queries[0], this.gl.QUERY_RESULT);
                const timeEnd = this.gl.getQueryParameter(this.queries[1], this.gl.QUERY_RESULT);
                timeElapsed = timeEnd - timeStart;
            } else {
                timeElapsed = this.gl.getQueryParameter(this.queries[0], this.gl.QUERY_RESULT);
            }

            this.finished = false;
        }

        return timeElapsed;

    }

    delete() {
        this.queries.forEach(q => this.gl.deleteQuery(q));
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

export class Profiler {

    constructor(gl) {
        this.gl = gl;

        this.marker = new Map();

        this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');

        // Clear the disjoint state before starting to work with queries to increase
        // the chances that the results will be valid.
        gl.getParameter(this.ext.GPU_DISJOINT_EXT);
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

}
