// Supabase Client
// Handles database operations with Supabase

const SupabaseClient = {
    client: null,
    initialized: false,
    
    // Initialize Supabase client
    init() {
        if (!StorageManager.isSupabaseConfigured()) {
            console.log('Supabase not configured, using local storage');
            return false;
        }
        
        try {
            this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            this.initialized = true;
            console.log('Supabase client initialized');
            return true;
        } catch (e) {
            console.error('Failed to initialize Supabase:', e);
            return false;
        }
    },
    
    // Reviewers operations
    async getReviewers() {
        if (!this.initialized) {
            return StorageManager.getAll('reviewer');
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.reviewers)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Error fetching reviewers:', e);
            return StorageManager.getAll('reviewer');
        }
    },
    
    async addReviewer(reviewer) {
        const newReviewer = {
            ...reviewer,
            id: reviewer.id || StorageManager.generateId(),
            created_at: new Date().toISOString()
        };
        
        if (!this.initialized) {
            return StorageManager.addToList('reviewer', newReviewer);
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.reviewers)
                .insert([newReviewer])
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (e) {
            console.error('Error adding reviewer:', e);
            return StorageManager.addToList('reviewer', newReviewer);
        }
    },
    
    async updateReviewer(id, updates) {
        if (!this.initialized) {
            return StorageManager.updateInList('reviewer', id, updates);
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.reviewers)
                .update(updates)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (e) {
            console.error('Error updating reviewer:', e);
            return StorageManager.updateInList('reviewer', id, updates);
        }
    },
    
    async deleteReviewer(id) {
        if (!this.initialized) {
            return StorageManager.removeFromList('reviewer', id);
        }
        
        try {
            const { error } = await this.client
                .from(DB_TABLES.reviewers)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Error deleting reviewer:', e);
            return StorageManager.removeFromList('reviewer', id);
        }
    },
    
    // Restaurants operations
    async getRestaurants() {
        if (!this.initialized) {
            let restaurants = StorageManager.getAll('restaurant');
            if (restaurants.length === 0) {
                // Initialize with default restaurants
                StorageManager.set('restaurants', DEFAULT_RESTAURANTS);
                restaurants = DEFAULT_RESTAURANTS;
            }
            return restaurants;
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.restaurants)
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                // Initialize with default restaurants
                await this.client.from(DB_TABLES.restaurants).insert(DEFAULT_RESTAURANTS);
                return DEFAULT_RESTAURANTS;
            }
            
            return data;
        } catch (e) {
            console.error('Error fetching restaurants:', e);
            let restaurants = StorageManager.getAll('restaurant');
            if (restaurants.length === 0) {
                StorageManager.set('restaurants', DEFAULT_RESTAURANTS);
                return DEFAULT_RESTAURANTS;
            }
            return restaurants;
        }
    },
    
    async addRestaurant(restaurant) {
        const newRestaurant = {
            ...restaurant,
            id: restaurant.id || StorageManager.generateId(),
            created_at: new Date().toISOString()
        };
        
        if (!this.initialized) {
            return StorageManager.addToList('restaurant', newRestaurant);
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.restaurants)
                .insert([newRestaurant])
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (e) {
            console.error('Error adding restaurant:', e);
            return StorageManager.addToList('restaurant', newRestaurant);
        }
    },
    
    async updateRestaurant(id, updates) {
        if (!this.initialized) {
            return StorageManager.updateInList('restaurant', id, updates);
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.restaurants)
                .update(updates)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (e) {
            console.error('Error updating restaurant:', e);
            return StorageManager.updateInList('restaurant', id, updates);
        }
    },
    
    async deleteRestaurant(id) {
        if (!this.initialized) {
            return StorageManager.removeFromList('restaurant', id);
        }
        
        try {
            const { error } = await this.client
                .from(DB_TABLES.restaurants)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Error deleting restaurant:', e);
            return StorageManager.removeFromList('restaurant', id);
        }
    },
    
    // Reviews operations
    async getReviews(restaurantId = null) {
        if (!this.initialized) {
            let reviews = StorageManager.getAll('review');
            if (restaurantId) {
                reviews = reviews.filter(r => r.restaurantId === restaurantId);
            }
            return reviews;
        }
        
        try {
            let query = this.client.from(DB_TABLES.reviews).select('*');
            
            if (restaurantId) {
                query = query.eq('restaurant_id', restaurantId);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Transform snake_case from database to camelCase for app
            return (data || []).map(review => this.transformReviewFromDb(review));
        } catch (e) {
            console.error('Error fetching reviews:', e);
            let reviews = StorageManager.getAll('review');
            if (restaurantId) {
                reviews = reviews.filter(r => r.restaurantId === restaurantId);
            }
            return reviews;
        }
    },
    
    // Transform review from database format to app format
    transformReviewFromDb(review) {
        return {
            id: review.id,
            restaurantId: review.restaurant_id,
            reviewerId: review.reviewer_id,
            totalSpend: review.total_spend,
            dishes: review.dishes || [],
            comment: review.comment,
            ratings: {
                taste: review.rating_taste,
                value: review.rating_value,
                service: review.rating_service,
                environment: review.rating_environment,
                presentation: review.rating_presentation,
                expectations: review.rating_expectations,
                returnRate: review.rating_return_rate
            },
            opinions: {
                portion: review.opinion_portion,
                speed: review.opinion_speed,
                variety: review.opinion_variety
            },
            createdAt: review.created_at
        };
    },
    
    async addReview(review) {
        const newReview = {
            id: review.id || StorageManager.generateId(),
            restaurant_id: review.restaurantId,
            reviewer_id: review.reviewerId,
            total_spend: review.totalSpend || null,
            dishes: review.dishes || [],
            comment: review.comment || null,
            rating_taste: review.ratings?.taste || null,
            rating_value: review.ratings?.value || null,
            rating_service: review.ratings?.service || null,
            rating_environment: review.ratings?.environment || null,
            rating_presentation: review.ratings?.presentation || null,
            rating_expectations: review.ratings?.expectations || null,
            rating_return_rate: review.ratings?.returnRate || null,
            opinion_portion: review.opinions?.portion || null,
            opinion_speed: review.opinions?.speed || null,
            opinion_variety: review.opinions?.variety || null,
            created_at: new Date().toISOString()
        };
        
        if (!this.initialized) {
            const localReview = {
                id: newReview.id,
                restaurantId: newReview.restaurant_id,
                reviewerId: newReview.reviewer_id,
                totalSpend: newReview.total_spend,
                dishes: newReview.dishes,
                comment: newReview.comment,
                ratings: {
                    taste: newReview.rating_taste,
                    value: newReview.rating_value,
                    service: newReview.rating_service,
                    environment: newReview.rating_environment,
                    presentation: newReview.rating_presentation,
                    expectations: newReview.rating_expectations,
                    returnRate: newReview.rating_return_rate
                },
                opinions: {
                    portion: newReview.opinion_portion,
                    speed: newReview.opinion_speed,
                    variety: newReview.opinion_variety
                },
                createdAt: newReview.created_at
            };
            return StorageManager.addToList('review', localReview);
        }
        
        try {
            const { data, error } = await this.client
                .from(DB_TABLES.reviews)
                .insert([newReview])
                .select();
            
            if (error) throw error;
            return data[0];
        } catch (e) {
            console.error('Error adding review:', e);
            // Fallback to local storage
            const localReview = {
                id: newReview.id,
                restaurantId: newReview.restaurant_id,
                reviewerId: newReview.reviewer_id,
                totalSpend: newReview.total_spend,
                dishes: newReview.dishes,
                comment: newReview.comment,
                ratings: {
                    taste: newReview.rating_taste,
                    value: newReview.rating_value,
                    service: newReview.rating_service,
                    environment: newReview.rating_environment,
                    presentation: newReview.rating_presentation,
                    expectations: newReview.rating_expectations,
                    returnRate: newReview.rating_return_rate
                },
                opinions: {
                    portion: newReview.opinion_portion,
                    speed: newReview.opinion_speed,
                    variety: newReview.opinion_variety
                },
                createdAt: newReview.created_at
            };
            return StorageManager.addToList('review', localReview);
        }
    },
    
    async deleteReview(id) {
        if (!this.initialized) {
            return StorageManager.removeFromList('review', id);
        }
        
        try {
            const { error } = await this.client
                .from(DB_TABLES.reviews)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Error deleting review:', e);
            return StorageManager.removeFromList('review', id);
        }
    },
    
    // Export/Import data
    async exportData() {
        const reviewers = await this.getReviewers();
        const restaurants = await this.getRestaurants();
        const reviews = await this.getReviews();
        
        return {
            reviewers,
            restaurants,
            reviews,
            exportedAt: new Date().toISOString()
        };
    }
};