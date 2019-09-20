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
    constructor(name, timespan) {
        this.name = name;
        this.queries = [];
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

    createMarker(name) {
        this.marker.set(name, {
            sum: 0,
            queries: []
        });
    }

    dispatchMarker(name) {
        const marker = this.marker.get(name);
        marker.queries.push(new Query(this.gl, this.ext));
    }

    tagMarker(name) {
        const marker = this.marker.get(name);
        const latestQuery = marker.queries[marker.queries.length - 1];
        latestQuery.stop();
    }

    collectMarker(name) {
        this.tagMarker(name);

        const marker = this.marker.get(name);

        marker.queries.forEach((q, i) => {
            let result = q.result();

            if (result !== null) {
                marker.sum += result;
                marker.queries.splice(i, 1);
            }
        });
    }

    getMarkerResult(name, seconds = 1) {
        const marker = this.marker.get(name);
        const result = marker.sum / (1e6 * seconds * 60);
        marker.sum = 0;
        return result;
    }

}
