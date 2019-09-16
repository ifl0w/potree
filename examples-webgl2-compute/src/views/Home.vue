<template>

    <v-content>
        <v-app-bar
                :collapse="false"
                absolute
                color="accent-4"
                dark
        >
            <v-btn text icon v-on:click="$router.push('/')">
                <v-icon>mdi-arrow-left</v-icon>
            </v-btn>

            <v-btn text icon>
                <v-icon>mdi-settings</v-icon>
            </v-btn>

        </v-app-bar>

        <v-container class="mt-12">
            <v-row>
                <v-col
                        v-for="card in cards"
                        :key="card.title"
                        :cols="card.flex"
                >
                    <v-card>
                        <v-img
                                :src="card.src"
                                class="white--text"
                                height="200px"
                                gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
                        >
                            <v-card-title
                                    class="fill-height align-end"
                                    v-text="card.title"
                            ></v-card-title>
                        </v-img>

                        <v-card-actions>
                            <div class="flex-grow-1"></div>

                            <v-btn @click="$router.push('view')">
                                View
                                <v-icon right>mdi-heart</v-icon>
                            </v-btn>

                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </v-content>

</template>

<script>
    export default {
        components: {},
        data: () => ({
            cards: [
                {title: 'Pre-fab homes', src: 'https://cdn.vuetifyjs.com/images/cards/house.jpg', flex: 12},
                {title: 'Favorite road trips', src: 'https://cdn.vuetifyjs.com/images/cards/road.jpg', flex: 6},
                {title: 'Best airlines', src: 'https://cdn.vuetifyjs.com/images/cards/plane.jpg', flex: 6},
            ],
        }),
    };
</script>
