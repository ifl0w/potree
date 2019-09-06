#version 310 es

layout(std140, binding=0) buffer DenseIndexBuffer
{
    uint indices[];
};

layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

// see https://preshing.com/20121224/how-to-generate-a-sequence-of-unique-random-integers/
// direct origin: https://github.com/m-schuetz/Fenek/blob/pcpp_modulify/modules/progressive/distribute.cs
// max uint == 2^32
uint prnPermute(uint number, uint prime){

    if(number > prime){
        return number;
    }

    uint q = number * number;
//    uint d = q / prime;
    uint residue = q % prime;

    if(number <= (prime >> 1)){
        return residue;
    }else{
        return prime - residue;
    }
}

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;

    if (linearIdx >= uint(indices.length())) {
        return;
    }

    //    uint prime = uint(4294967291); // 2^32 - 5 (https://primes.utm.edu/lists/2small/0bit.html)
    uint prime = uint(24999983); // prime < 25M && (prime - 3) mod 4 = 0
    indices[linearIdx] = prnPermute(linearIdx, prime);
}
