export class MemoryManagerEntry {

    constructor(address, size) {
        this.address = address;
        this.size = size;

        this.isFree = true;
        this.next = null;
        this.accessed = false;
    }

    fit(size) {
        return this.isFree && this.size >= size;
    }

    alloc(size) {
        this.split(size);
        // this.next.merge(); // additional cleanup

        this.isFree = false;
        this.accessed = true;
        return this;
    }

    free() {
        this.merge();
        this.isFree = true;
    }

    split(size) {
        const newNext = new MemoryManagerEntry(this.address + size, this.size - size);
        newNext.next = this.next;

        this.size = size;
        this.next = newNext;
    }

    merge() {
        if (this.next && this.next.isFree) {
            this.next.merge(); // recursively merge chunks

            this.size = this.size + this.next.size;
            this.next = this.next.next;
        }
    }
}

export class MemoryManager {

    constructor(size) {
        this.size = size;
        this.utilization = 0;

        this.head = new MemoryManagerEntry(0, size);
    }

    alloc(size) {
        let current = this.head;
        while (current.next != null) {
            if (current.fit(size)) {
                let mme = current.alloc(size);
                this.utilization += mme.size / this.size;
                return mme;
            }

            current = current.next;
        }
        // last element
        if (current.fit(size)) {
            let mme = current.alloc(size);
            this.utilization += mme.size / this.size;
            return mme;
        }

        return null;
    }

    free(element) {
        if (!element.isFree) {
            this.utilization -= element.size / this.size;
        }

        element.free();
    }

    freeBlocks() {
        const result = [];

        let current = this.head;
        while (current.next != null) {
            if (current.isFree) {
                result.push(current);
            }
            current = current.next;
        }
        // last element
        if (current.isFree) {
            result.push(current);
        }
        return result;
    }

    allBlocks() {
        const result = [];

        let current = this.head;
        while (current.next != null) {
            result.push(current);
            current = current.next;
        }
        // last element
        result.push(current);

        return result;
    }

}
