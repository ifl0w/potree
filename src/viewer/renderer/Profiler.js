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
}

class Marker {
    constructor(name) {
        this.name = name;
        this.queries = [];

        this.reset();
    }

    resolveQueries() {
        this.queries.forEach(q => q.stop());

        this.queries.forEach((q, i) => {
            let result = q.result();
            if (result !== null) {
                this.sum += result;
                this.measurements++;
                this.min = Math.min(this.min, result);
                this.max = Math.max(this.max, result);
                this.queries.splice(i, 1);
            }
        });
    }

    reset() {
        this.min = Infinity; // minimum value of current queries
        this.max = -Infinity; // maximum value of current queries
        this.sum = 0; // sum of the finished query timings
        this.measurements = 0;
        this.lastCollect = performance.now(); // timestamp of last collect
    }

    collect() {
        const avg = this.sum / this.measurements;
        const result = {
            avg: (avg / 1e6).toFixed(2),
            min: (this.min / 1e6).toFixed(2),
            max: (this.max / 1e6).toFixed(2) };
        this.reset();
        return result;
    }
}

export class Profiler {

    constructor(gl, reportTimeSpan = 1000) {
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
    }

    stop(name) {
        const marker = this.marker.get(name);
        marker.resolveQueries();
    }

    collectResults(name) {
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
