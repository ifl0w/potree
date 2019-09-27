export class MemoryManagerEntry {

    constructor(address, size) {
        this.address = address;
        this.size = size;

        this.isFree = true;
        this.next = null;
        this.prev = null;
        this.importance = 0;
    }

    fit(size) {
        return this.isFree && this.size >= size;
    }

    alloc(size) {
        this.split(size);

        this.isFree = false;
        this.importance = 0;
        return this;
    }

    free() {
        this.merge();
        this.isFree = true;
    }

    split(size) {
        const newNext = new MemoryManagerEntry(this.address + size, this.size - size);
        newNext.next = this.next;
        newNext.prev = this;
        if (this.next) {
            this.next.prev = newNext;
        }

        this.size = size;
        this.next = newNext;
    }

    merge() {
        let prev = this.prev;
        // never merge with the head element to ensure valid entry point for search
        while (prev && prev.isFree && prev.prev) {
            this.address = prev.address;
            this.size = this.size + prev.size;

            this.prev = prev.prev;
            if (this.prev){
                this.prev.next = this;
            }

            prev = prev.prev;
        }

        if (prev){
            prev.next = this;
        }

        let next = this.next;
        while (next && next.isFree) {
            this.size = this.size + next.size;

            this.next = next.next;
            if (this.next){
                this.next.prev = this;
            }

            next = next.next;
        }

        if (next){
            next.prev = this;
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
