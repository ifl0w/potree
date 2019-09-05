export class MemoryManagerEntry {

    constructor(address, size) {
        this.address = address;
        this.size = size;

        this.isFree = true;
        this.next = null;
        this.accessed = true;
    }

    fit(size) {
        return this.isFree && this.size >= size;
    }

    alloc(size) {
        // split here

        this.split(size);

        this.isFree = false;
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

        this.head = new MemoryManagerEntry(0, size);
    }

    alloc(size) {

        let current = this.head;

        while (current.next != null) {
            if (current.fit(size)) {
                return current.alloc(size);
            }

            current = current.next;
        }
        // last element
        if (current.fit(size)) {
            return current.alloc(size);
        }

        return null;
    }

    static free(element) {
        MemoryManager.free();
    }

}
