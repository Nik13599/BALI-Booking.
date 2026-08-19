plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "by.bali.booking"
    compileSdk = 35
    defaultConfig {
        applicationId = "by.bali.booking"
        minSdk = 24
        targetSdk = 35
        versionCode = 20
        versionName = "20.0.0"
    }
    buildTypes { release { isMinifyEnabled = false } }
}

dependencies { implementation("androidx.appcompat:appcompat:1.7.0") }
